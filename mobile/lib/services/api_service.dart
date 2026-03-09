import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:io';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/api_constants.dart';

/// Centralized API Service for handling all HTTP requests
/// Provides consistent error handling, authentication, and request/response management
/// Token + user are persisted in SharedPreferences (mirrors web app's localStorage 'tgs_user' key).
class ApiService {
  static final ApiService _instance = ApiService._internal();

  String? _authToken;
  Map<String, dynamic>? _currentUser;

  factory ApiService() {
    return _instance;
  }

  ApiService._internal();

  // ─── Session Persistence ─────────────────────────────────────────────────

  /// Load persisted session from SharedPreferences on app launch.
  /// Call this in main() before runApp() so all screens start authenticated.
  static Future<void> loadSession() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString('tgs_user');
    if (stored != null && stored.isNotEmpty) {
      try {
        final userData = jsonDecode(stored) as Map<String, dynamic>;
        final token = userData['token']?.toString() ?? '';
        if (token.isNotEmpty) {
          _instance._authToken = token;
          _instance._currentUser = userData;
        }
      } catch (_) {
        // Corrupted data — clear it
        await prefs.remove('tgs_user');
      }
    }
  }

  /// Persist token + full user map to SharedPreferences.
  Future<void> _saveSession() async {
    final prefs = await SharedPreferences.getInstance();
    if (_currentUser != null) {
      final data = Map<String, dynamic>.from(_currentUser!);
      data['token'] = _authToken ?? '';
      await prefs.setString('tgs_user', jsonEncode(data));
    }
  }

  // ─── Token / User Setters ────────────────────────────────────────────────

  /// Set authentication token from login response and persist it.
  Future<void> setToken(String token) async {
    _authToken = token;
    await _saveSession();
  }

  /// Clear token on logout — removes from memory AND SharedPreferences.
  Future<void> clearToken() async {
    _authToken = null;
    _currentUser = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('tgs_user');
  }

  /// Store user details and persist them.
  Future<void> setUser(Map<String, dynamic> user) async {
    _currentUser = user;
    await _saveSession();
  }

  /// Get current user details.
  Map<String, dynamic>? getUser() => _currentUser;

  /// Fetch latest user profile from server and update local session.
  Future<Map<String, dynamic>> fetchFreshUser() async {
    final response = await get(ApiConstants.authProfile, includeAuth: true);
    if (response is Map<String, dynamic>) {
      await setUser(response);
      return response;
    }
    throw Exception('Failed to fetch fresh user data');
  }

  /// Get current token.
  String? getToken() => _authToken;

  /// Whether a valid session is loaded.
  bool get isAuthenticated => _authToken != null && _authToken!.isNotEmpty;

  // ─── Headers ─────────────────────────────────────────────────────────────

  Map<String, String> _buildHeaders({bool includeAuth = true}) {
    final headers = Map<String, String>.from(ApiConstants.headers);
    if (includeAuth && _authToken != null) {
      headers['Authorization'] = 'Bearer $_authToken';
    }
    return headers;
  }

  Uri _buildUri(String endpoint) {
    if (endpoint.startsWith('http')) {
      return Uri.parse(endpoint);
    }
    // Remove leading slash if present
    final path = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    return Uri.parse('${ApiConstants.baseUrl}/$path');
  }

  // ─── HTTP Methods ─────────────────────────────────────────────────────────

  /// POST request
  Future<dynamic> post(
    String endpoint, {
    required Map<String, dynamic> body,
    bool includeAuth = false,
  }) async {
    try {
      final response = await http
          .post(
            _buildUri(endpoint),
            headers: _buildHeaders(includeAuth: includeAuth),
            body: jsonEncode(body),
          )
          .timeout(
            const Duration(milliseconds: ApiConstants.requestTimeout),
            onTimeout: () => throw TimeoutException('Request timeout'),
          );

      return _handleResponse(response);
    } on SocketException {
      throw NetworkException('No internet connection');
    } on TimeoutException {
      throw TimeoutException('Request timeout. Please try again.');
    } catch (e) {
      rethrow;
    }
  }

  /// GET request
  Future<dynamic> get(
    String endpoint, {
    bool includeAuth = true,
  }) async {
    try {
      final response = await http
          .get(
            _buildUri(endpoint),
            headers: _buildHeaders(includeAuth: includeAuth),
          )
          .timeout(
            const Duration(milliseconds: ApiConstants.requestTimeout),
            onTimeout: () => throw TimeoutException('Request timeout'),
          );

      return _handleResponse(response);
    } on SocketException {
      throw NetworkException('No internet connection');
    } on TimeoutException {
      throw TimeoutException('Request timeout. Please try again.');
    } catch (e) {
      rethrow;
    }
  }

  /// PUT request
  Future<dynamic> put(
    String endpoint, {
    required Map<String, dynamic> body,
    bool includeAuth = true,
  }) async {
    try {
      final response = await http
          .put(
            _buildUri(endpoint),
            headers: _buildHeaders(includeAuth: includeAuth),
            body: jsonEncode(body),
          )
          .timeout(
            const Duration(milliseconds: ApiConstants.requestTimeout),
            onTimeout: () => throw TimeoutException('Request timeout'),
          );

      return _handleResponse(response);
    } on SocketException {
      throw NetworkException('No internet connection');
    } on TimeoutException {
      throw TimeoutException('Request timeout. Please try again.');
    } catch (e) {
      rethrow;
    }
  }

  /// PATCH request
  Future<dynamic> patch(
    String endpoint, {
    required Map<String, dynamic> body,
    bool includeAuth = true,
  }) async {
    try {
      final response = await http
          .patch(
            _buildUri(endpoint),
            headers: _buildHeaders(includeAuth: includeAuth),
            body: jsonEncode(body),
          )
          .timeout(
            const Duration(milliseconds: ApiConstants.requestTimeout),
            onTimeout: () => throw TimeoutException('Request timeout'),
          );

      return _handleResponse(response);
    } on SocketException {
      throw NetworkException('No internet connection');
    } on TimeoutException {
      throw TimeoutException('Request timeout. Please try again.');
    } catch (e) {
      rethrow;
    }
  }

  /// DELETE request
  Future<dynamic> delete(
    String endpoint, {
    bool includeAuth = true,
  }) async {
    try {
      final response = await http
          .delete(
            _buildUri(endpoint),
            headers: _buildHeaders(includeAuth: includeAuth),
          )
          .timeout(
            const Duration(milliseconds: ApiConstants.requestTimeout),
            onTimeout: () => throw TimeoutException('Request timeout'),
          );

      return _handleResponse(response);
    } on SocketException {
      throw NetworkException('No internet connection');
    } on TimeoutException {
      throw TimeoutException('Request timeout. Please try again.');
    } catch (e) {
      rethrow;
    }
  }

  // ─── Response Handler ─────────────────────────────────────────────────────

  dynamic _handleResponse(http.Response response) {
    if (response.statusCode == 204) {
      return {'success': true};
    }

    try {
      final data = response.body.isEmpty ? {} : jsonDecode(response.body);

      switch (response.statusCode) {
        case 200:
        case 201:
          return data;
        case 400:
          throw BadRequestException(
            _extractMessage(data, 'Bad request'),
          );
        case 401:
          clearToken(); // clear persisted session on auth failure
          throw UnauthorizedException(
            _extractMessage(data, 'Unauthorized. Please login again.'),
          );
        case 403:
          throw ForbiddenException(
            _extractMessage(data, 'Access forbidden'),
          );
        case 404:
          throw NotFoundException(
            _extractMessage(data, 'Resource not found'),
          );
        case 500:
          throw ServerException(
            _extractMessage(data, 'Server error. Please try again later.'),
          );
        default:
          throw Exception('Unknown error. Status: ${response.statusCode}');
      }
    } on FormatException {
      // Response was not valid JSON
      if (response.statusCode == 200 || response.statusCode == 201) {
        return response.body;
      }
      throw Exception('Invalid server response (status ${response.statusCode})');
    } catch (e) {
      rethrow;
    }
  }

  String _extractMessage(dynamic data, String fallback) {
    if (data is Map) {
      return (data['detail'] ?? data['error'] ?? data['message'] ?? fallback).toString();
    }
    return fallback;
  }
}

// ─── Custom Exception Classes ─────────────────────────────────────────────────

class NetworkException implements Exception {
  final String message;
  NetworkException(this.message);
  @override
  String toString() => message;
}

class TimeoutException implements Exception {
  final String message;
  TimeoutException(this.message);
  @override
  String toString() => message;
}

class BadRequestException implements Exception {
  final String message;
  BadRequestException(this.message);
  @override
  String toString() => message;
}

class UnauthorizedException implements Exception {
  final String message;
  UnauthorizedException(this.message);
  @override
  String toString() => message;
}

class ForbiddenException implements Exception {
  final String message;
  ForbiddenException(this.message);
  @override
  String toString() => message;
}

class NotFoundException implements Exception {
  final String message;
  NotFoundException(this.message);
  @override
  String toString() => message;
}

class ServerException implements Exception {
  final String message;
  ServerException(this.message);
  @override
  String toString() => message;
}
