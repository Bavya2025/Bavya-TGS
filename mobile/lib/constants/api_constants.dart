/// API Configuration Constants
/// Centralized API endpoints and base URL configuration
class ApiConstants {
  // Base URL - Configure based on your deployment
  // 1. Android Emulator: http://10.0.2.2:6781
  // 2. Physical Device: http://192.168.1.148:6781 (Replace with your machine IP)
  // 3. iOS Simulator: http://localhost:6781

  // Using 10.0.2.2 for emulator support by default.
  // Change to your machine IP if testing on a physical device.
  static const String baseUrl = 'http://192.168.1.138:6784';
  // static const String baseUrl = 'http://10.0.2.2:4567';

  // Authentication Endpoints
  static const String authLogin = '$baseUrl/api/auth/login';
  static const String authLogout = '$baseUrl/api/auth/logout';
  static const String authRegister = '$baseUrl/api/auth/register';

  // Travel/Trip Endpoints
  static const String trips = '$baseUrl/api/trips/';
  static const String travels = '$baseUrl/api/travels/';
  static const String tripDetails = '$baseUrl/api/trips/{id}/';
  static const String travelDetails = '$baseUrl/api/travels/{id}/';
  static const String tripApprovals = '$baseUrl/api/trips/approvals/';
  static const String settlement = '$baseUrl/api/settlement/';
  static const String UserAdvances = '$baseUrl/api/advances/';
  static const String geoHierarchy = '$baseUrl/api/geo/hierarchy/';
  static const String locations = '$baseUrl/api/masters/locations/';
  static const String findPaths = '$baseUrl/api/masters/routes/find_paths/';
  static const String fuelRates = '$baseUrl/api/masters/fuel-rate-masters/my_rate/';

  // Expense Endpoints
  static const String expenses = '$baseUrl/api/expenses/';
  static const String claims = '$baseUrl/api/claims/';
  static const String expenseApprovals = '$baseUrl/api/expenses/approvals/';
  static const String disputes = '$baseUrl/api/disputes/';
  static const String approvals = '$baseUrl/api/approvals/';
  static const String approvalsCount = '$baseUrl/api/approvals/count/';
  static const String policies = '$baseUrl/api/policies/';
  static const String policyDetails = '$baseUrl/api/policies/{id}/';

  // Bulk Activity Endpoints
  static const String bulkTemplate = '$baseUrl/api/bulk-activities/template/';
  static const String bulkUpload = '$baseUrl/api/bulk-activities/upload/';

  // Guest House Endpoints
  static const String guestHouse = '$baseUrl/api/guesthouse/';

  // Admin Endpoints
  static const String users = '$baseUrl/api/users/';
  static const String roles = '$baseUrl/api/roles/';
  static const String auditLogs = '$baseUrl/api/audit-logs/';
  static const String loginHistory = '$baseUrl/api/login-history/';

  // API Management Endpoints
  static const String apiDashboardStats = '$baseUrl/api/dashboard/stats/';
  static const String apiAccessKeys = '$baseUrl/api/access-keys/';
  static const String apiDynamicEndpoints = '$baseUrl/api/dynamic-endpoints/';
  static const String apiUpdateKey = '$baseUrl/api/apikey';
  static const String apiConnect = '$baseUrl/api/connect/';

  // Notifications
  static const String notifications = '$baseUrl/api/notifications/';
  static const String notificationsMarkRead =
      '$baseUrl/api/notifications/mark-all-read/';

  // FRS Endpoints
  static const String frsEnroll = '$baseUrl/api/frs/enroll';
  static const String frsVerify = '$baseUrl/api/frs/verify';
  static const String frsApprovals = '$baseUrl/api/frs/approvals';
  static const String frsHandleApproval = '$baseUrl/api/frs/handle-approval';
  static const String frsRequestUpdate = '$baseUrl/api/frs/request-update';
  static const String frsUpdateRequests = '$baseUrl/api/frs/update-requests';
  static const String frsHandleRequest = '$baseUrl/api/frs/handle-request';
  static const String frsClearNotifications =
      '$baseUrl/api/frs/clear-notifications';
  static const String frsFaceRequests = '$baseUrl/api/frs/face-requests';
  static const String frsHandleFaceRequest =
      '$baseUrl/api/frs/handle-face-request';
  static const String authProfile = '$baseUrl/api/auth/profile';

  // HTTP Headers
  static const Map<String, String> headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Request timeout in milliseconds
  static const int requestTimeout = 30000;

  // System API Key (Matches backend AccessKey entries)
  static const String apiKey = 'MOBILE-APP-PROD-2025-V11';
}
