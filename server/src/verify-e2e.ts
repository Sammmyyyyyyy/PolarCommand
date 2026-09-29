import { prisma } from './config/database.js';

const API_BASE = 'http://localhost:5000/api';

interface LoginResult {
  token: string;
  user: any;
}

async function login(email: string, password = 'password123'): Promise<LoginResult> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Login failed for ${email}: ${err.error || res.statusText}`);
  }
  const data = await res.json();
  return { token: data.token, user: data.user };
}

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function runTests() {
  console.log('============================================================');
  console.log('POLARCOMMAND COMPLETE ARCHITECTURE & RBAC E2E TEST SUITE');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // 1. AUTHENTICATION & LOGIN FLOW (Matrix roles)
    // -------------------------------------------------------------
    console.log('TEST GROUP 1: User Login & Scope Resolution');
    const admin = await login('admin@polarcommand.org');
    assert(admin.user.role === 'ADMIN', 'Admin user authenticated with ADMIN role');
    assert(admin.user.scope.isGlobalAdmin === true, 'Admin has global unrestricted scope');

    const bharatiManager = await login('bharati.manager@polarcommand.org');
    assert(bharatiManager.user.role === 'STATION_MANAGER', 'Bharati Manager authenticated with STATION_MANAGER role');
    assert(bharatiManager.user.scope.isStationManager === true, 'Station Manager scope flag is active');
    assert(bharatiManager.user.scope.primaryStationId === bharatiManager.user.stationId, 'Station Manager primaryStationId correctly assigned');

    const maitriManager = await login('maitri.manager@polarcommand.org');
    assert(maitriManager.user.role === 'STATION_MANAGER', 'Maitri Manager authenticated with STATION_MANAGER role');
    assert(maitriManager.user.scope.primaryStationId !== bharatiManager.user.scope.primaryStationId, 'Maitri Manager has different station scope from Bharati Manager');

    const expLeader = await login('leader@polarcommand.org');
    assert(expLeader.user.role === 'EXPEDITION_LEADER', 'Expedition Leader authenticated with EXPEDITION_LEADER role');
    assert(expLeader.user.scope.isExpeditionLeader === true, 'Expedition Leader scope flag is active');
    assert(expLeader.user.scope.primaryExpeditionId !== null, 'Expedition Leader primaryExpeditionId is assigned');

    const teamMember = await login('member@polarcommand.org');
    assert(teamMember.user.role === 'TEAM_MEMBER', 'Team Member authenticated with TEAM_MEMBER role');
    assert(teamMember.user.scope.isTeamMember === true, 'Team Member scope flag is active');
    assert(teamMember.user.scope.teamLeaderId !== null, 'Team Member has teamLeaderId linked (Dr. Anita Singh)');

    // -------------------------------------------------------------
    // 2. SCOPE ISOLATION: Stations
    // -------------------------------------------------------------
    console.log('\nTEST GROUP 2: Station Scoping (Test A & Test N)');
    // Admin sees all stations
    const adminStationsRes = await fetch(`${API_BASE}/stations`, { headers: authHeaders(admin.token) });
    const adminStations = await adminStationsRes.json();
    assert(Array.isArray(adminStations) && adminStations.length === 3, 'Test N: Admin can see all 3 canonical stations', `Got ${adminStations.length}`);

    // Bharati Station Manager sees ONLY Bharati Station
    const bharatiStationsRes = await fetch(`${API_BASE}/stations`, { headers: authHeaders(bharatiManager.token) });
    const bharatiStations = await bharatiStationsRes.json();
    assert(Array.isArray(bharatiStations) && bharatiStations.length === 1, 'Test A: Station Manager sees exactly 1 station', `Got ${bharatiStations.length}`);
    assert(bharatiStations[0]?.id === bharatiManager.user.scope.primaryStationId, 'Test A: Station Manager assigned to Bharati sees ONLY Bharati');
    const cannotSeeMaitri = !bharatiStations.some((s: any) => s.name.toLowerCase().includes('maitri'));
    assert(cannotSeeMaitri, 'Test A: Bharati Station Manager CANNOT see or access Maitri Station data');

    // -------------------------------------------------------------
    // 3. SCOPE ISOLATION: Expeditions (Test B & Test C)
    // -------------------------------------------------------------
    console.log('\nTEST GROUP 3: Expedition Scoping (Test B, Test C & Test N)');
    // Admin sees all expeditions
    const adminExpRes = await fetch(`${API_BASE}/expeditions`, { headers: authHeaders(admin.token) });
    const adminExp = await adminExpRes.json();
    assert(Array.isArray(adminExp) && adminExp.length >= 2, 'Test N: Admin sees all expeditions in system', `Got ${adminExp.length}`);

    // Expedition Leader sees ONLY their assigned expedition
    const leaderExpRes = await fetch(`${API_BASE}/expeditions`, { headers: authHeaders(expLeader.token) });
    const leaderExp = await leaderExpRes.json();
    assert(Array.isArray(leaderExp) && leaderExp.length === 1, 'Test B: Expedition Leader assigned to Amery sees ONLY 1 expedition', `Got ${leaderExp.length}`);
    assert(leaderExp[0]?.id === expLeader.user.scope.primaryExpeditionId, 'Test B: Expedition Leader assigned to Amery sees ONLY Amery expedition');

    // Team Member sees ONLY their assigned expedition
    const memberExpRes = await fetch(`${API_BASE}/expeditions`, { headers: authHeaders(teamMember.token) });
    const memberExp = await memberExpRes.json();
    assert(Array.isArray(memberExp) && memberExp.length === 1, 'Test C: Team Member assigned to Amery sees ONLY their assigned expedition', `Got ${memberExp.length}`);

    // Bharati Station Manager sees ONLY expeditions linked to Bharati (INPEX-2027 and Amery Deep Core)
    const bharatiExpRes = await fetch(`${API_BASE}/expeditions`, { headers: authHeaders(bharatiManager.token) });
    const bharatiExp = await bharatiExpRes.json();
    assert(bharatiExp.length > 0 && bharatiExp.every((e: any) => e.stationIds.includes(bharatiManager.user.scope.primaryStationId)), 'Station Manager sees only expeditions operating from their station');

    // -------------------------------------------------------------
    // 4. TEAM MEMBER EMERGENCY SOS PIPELINE (Test D, E, F, G, H, I)
    // -------------------------------------------------------------
    console.log('\nTEST GROUP 4: Team Member Emergency SOS Pipeline (Test D, E, F, G, H, I)');

    // Record initial notification counts
    const adminNotifBefore = await (await fetch(`${API_BASE}/notifications/unread-count`, { headers: authHeaders(admin.token) })).json();
    const leaderNotifBefore = await (await fetch(`${API_BASE}/notifications/unread-count`, { headers: authHeaders(expLeader.token) })).json();
    const managerNotifBefore = await (await fetch(`${API_BASE}/notifications/unread-count`, { headers: authHeaders(bharatiManager.token) })).json();

    // Rahul Sharma transmits SOS Emergency
    const ameryExpId = teamMember.user.scope.primaryExpeditionId;
    const sosRes = await fetch(`${API_BASE}/emergencies`, {
      method: 'POST',
      headers: authHeaders(teamMember.token),
      body: JSON.stringify({
        expeditionId: ameryExpId,
        incidentType: 'MEDICAL',
        severity: 'CRITICAL',
        location: 'Amery Borehole Sector 4 - Glacial Crevasse',
        description: 'Team scientist fell into 12m glacial crevasse. Compound leg fracture. Immediate SAR rescue required.',
        peopleAffected: 1,
      }),
    });
    assert(sosRes.ok, 'Rahul Sharma transmits SOS Emergency via POST /api/emergencies');
    const incidentData = await sosRes.json();
    assert(incidentData.id !== undefined, 'SOS incident created with ID');

    // Wait a brief moment for database commit
    await new Promise((r) => setTimeout(r, 200));

    // Test D: Admin receives it
    const adminAlertsRes = await fetch(`${API_BASE}/alerts`, { headers: authHeaders(admin.token) });
    const adminAlerts = await adminAlertsRes.json();
    const adminFoundSOS = adminAlerts.some((a: any) => a.title.includes('SOS') || a.message?.includes('glacial crevasse'));
    assert(adminFoundSOS, 'Test D: Admin receives Team Member SOS on Alerts page');

    const adminNotifAfter = await (await fetch(`${API_BASE}/notifications/unread-count`, { headers: authHeaders(admin.token) })).json();
    assert(adminNotifAfter.unreadCount > adminNotifBefore.unreadCount, 'Test D/I: Admin unread notification count increased');

    // Test E: Expedition Leader (Dr. Anita Singh) receives it
    const leaderAlertsRes = await fetch(`${API_BASE}/alerts`, { headers: authHeaders(expLeader.token) });
    const leaderAlerts = await leaderAlertsRes.json();
    const leaderFoundSOS = leaderAlerts.some((a: any) => a.title.includes('SOS') || a.message?.includes('glacial crevasse'));
    assert(leaderFoundSOS, 'Test E: Expedition Leader receives Team Member SOS on Alerts page');

    const leaderNotifAfter = await (await fetch(`${API_BASE}/notifications/unread-count`, { headers: authHeaders(expLeader.token) })).json();
    assert(leaderNotifAfter.unreadCount > leaderNotifBefore.unreadCount, 'Test E/I: Expedition Leader unread notification count increased');

    // Test F: Relevant Station Manager (Dr. Rajesh Nair at Bharati) receives it
    const managerAlertsRes = await fetch(`${API_BASE}/alerts`, { headers: authHeaders(bharatiManager.token) });
    const managerAlerts = await managerAlertsRes.json();
    const managerFoundSOS = managerAlerts.some((a: any) => a.title.includes('SOS') || a.message?.includes('glacial crevasse'));
    assert(managerFoundSOS, 'Test F: Relevant Station Manager receives SOS on Alerts page');

    const managerNotifAfter = await (await fetch(`${API_BASE}/notifications/unread-count`, { headers: authHeaders(bharatiManager.token) })).json();
    assert(managerNotifAfter.unreadCount > managerNotifBefore.unreadCount, 'Test F/I: Station Manager unread notification count increased');

    // Test G: Creator (Rahul Sharma) receives it
    const memberAlertsRes = await fetch(`${API_BASE}/alerts`, { headers: authHeaders(teamMember.token) });
    const memberAlerts = await memberAlertsRes.json();
    const memberFoundSOS = memberAlerts.some((a: any) => a.title.includes('SOS') || a.message?.includes('glacial crevasse'));
    assert(memberFoundSOS, 'Test G: Team Member (creator) sees their own SOS on Alerts page');

    // Test H: SOS appears in notification list
    const adminNotifList = await (await fetch(`${API_BASE}/notifications`, { headers: authHeaders(admin.token) })).json();
    assert(adminNotifList.length > 0 && adminNotifList.some((n: any) => n.title.includes('SOS') || n.title.includes('EMERGENCY')), 'Test H: SOS appears in persistent notifications list');

    // Test I: Marking notification read decreases count
    const targetNotif = adminNotifList.find((n: any) => !n.isRead);
    if (targetNotif) {
      await fetch(`${API_BASE}/notifications/${targetNotif.id}/read`, {
        method: 'PATCH',
        headers: authHeaders(admin.token),
      });
      const adminNotifRead = await (await fetch(`${API_BASE}/notifications/unread-count`, { headers: authHeaders(admin.token) })).json();
      assert(adminNotifRead.unreadCount < adminNotifAfter.unreadCount, 'Test I: Reading notification decreases unread count');
    }

    // -------------------------------------------------------------
    // 5. INVENTORY ALERT & RESTOCK FLOW (Test J, K, L, M)
    // -------------------------------------------------------------
    console.log('\nTEST GROUP 5: Inventory Alert & Restock Pipeline (Test J, K, L, M)');

    // Test J: Admin sends low inventory alert targeting Bharati Station Manager
    const managerNotifBeforeStock = await (await fetch(`${API_BASE}/notifications/unread-count`, { headers: authHeaders(bharatiManager.token) })).json();
    const invAlertRes = await fetch(`${API_BASE}/alerts`, {
      method: 'POST',
      headers: authHeaders(admin.token),
      body: JSON.stringify({
        stationId: bharatiManager.user.scope.primaryStationId,
        type: 'INVENTORY_LOW',
        severity: 'HIGH',
        title: 'Low Stock Alert: Field Medical Trauma Kits (Bharati Station)',
        affectedEntity: 'Bharati Station - Field Medical Trauma Kits',
        reason: 'Current stock has breached safety threshold.',
        impact: 'Stockout expected in 4 days if replenishment not ordered.',
        recommendedAction: 'Station Manager review and create requirement for Logistics Coordinator.',
        status: 'ACTIVE',
      }),
    });
    assert(invAlertRes.ok, 'Test J: Admin successfully posts low inventory alert to /api/alerts without 500 error');

    // Station Manager receives it
    const managerAlertsAfterStock = await (await fetch(`${API_BASE}/alerts`, { headers: authHeaders(bharatiManager.token) })).json();
    const managerGotStockAlert = managerAlertsAfterStock.some((a: any) => a.title.includes('Field Medical Trauma Kits'));
    assert(managerGotStockAlert, 'Test J: Station Manager receives the low inventory alert on Alerts page');

    const managerNotifAfterStock = await (await fetch(`${API_BASE}/notifications/unread-count`, { headers: authHeaders(bharatiManager.token) })).json();
    assert(managerNotifAfterStock.unreadCount > managerNotifBeforeStock.unreadCount, 'Test J: Station Manager unread notification badge incremented');

    // Test K & L: Station Manager creates requirement (auto-attached to Bharati)
    const reqRes = await fetch(`${API_BASE}/restock-requests`, {
      method: 'POST',
      headers: authHeaders(bharatiManager.token),
      body: JSON.stringify({
        itemName: 'Field Medical Trauma Kits',
        category: 'Medical',
        requestedQuantity: 25,
        unit: 'kits',
        priority: 'CRITICAL',
        notes: 'Critical restocking requested for Bharati base medical bay.',
      }),
    });
    assert(reqRes.ok, 'Test K: Station Manager creates restock requirement successfully');
    const createdReq = await reqRes.json();
    assert(createdReq.stationId === bharatiManager.user.scope.primaryStationId, 'Test L: StationId is automatically attached from user scope (Bharati)');
    assert(createdReq.requestedByName === bharatiManager.user.name, 'Test L: RequestedByName is set to authenticated Station Manager name');

    // Test M: Station Manager creates Equipment (auto-attached to Bharati)
    const assetRes = await fetch(`${API_BASE}/expeditions/${ameryExpId}/assets`, {
      method: 'POST',
      headers: authHeaders(bharatiManager.token),
      body: JSON.stringify({
        name: 'Bharati Deep Ice Core Drill Rig',
        type: 'Scientific Equipment',
        operatingHours: 45,
        maintenanceInterval: 300,
        fuelConsumptionPerHour: 12,
        status: 'Operational',
      }),
    });
    assert(assetRes.ok, 'Test M: Station Manager creates new equipment asset without failing');
    const createdAsset = await assetRes.json();
    assert(createdAsset.stationId === bharatiManager.user.scope.primaryStationId, 'Test M: Asset stationId is automatically attached to Bharati Station');

    // Verify Asset persists
    const assetsListRes = await fetch(`${API_BASE}/expeditions/${ameryExpId}/assets`, { headers: authHeaders(bharatiManager.token) });
    const assetsList = await assetsListRes.json();
    assert(assetsList.some((a: any) => a.name === 'Bharati Deep Ice Core Drill Rig'), 'Test M: Created asset persists in assets list');

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n============================================================');
    console.log(`TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('============================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test Suite encountered error:', err);
    process.exit(1);
  }
}

runTests();
