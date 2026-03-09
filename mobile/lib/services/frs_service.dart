import 'dart:convert';
import 'dart:io';
import 'package:camera/camera.dart';
import '../constants/api_constants.dart';
import 'api_service.dart';

class FrsService {
  final ApiService _apiService = ApiService();

  Future<Map<String, dynamic>> enrollFace(XFile imageFile) async {
    try {
      final bytes = await imageFile.readAsBytes();
      final base64Image = base64Encode(bytes);

      return await _apiService.post(
        ApiConstants.frsEnroll,
        body: {'face_image': base64Image},
        includeAuth: true,
      );
    } catch (e) {
      throw Exception('Face enrollment failed: $e');
    }
  }

  Future<Map<String, dynamic>> verifyFace(XFile imageFile, {double? lat, double? lng, String? address}) async {
    try {
      final bytes = await imageFile.readAsBytes();
      final base64Image = base64Encode(bytes);

      return await _apiService.post(
        ApiConstants.frsVerify,
        body: {
          'face_image': base64Image,
          'latitude': lat,
          'longitude': lng,
          'address': address,
        },
        includeAuth: true,
      );
    } catch (e) {
      throw Exception('Face verification failed: $e');
    }
  }

  Future<List<dynamic>> getPendingApprovals() async {
    return await _apiService.get(ApiConstants.frsApprovals, includeAuth: true);
  }

  Future<Map<String, dynamic>> handleApproval(int attendanceId, String action, String remarks) async {
    return await _apiService.post(
      ApiConstants.frsHandleApproval,
      body: {
        'attendance_id': attendanceId,
        'action': action,
        'remarks': remarks,
      },
      includeAuth: true,
    );
  }

  Future<Map<String, dynamic>> requestPhotoUpdate(String reason) async {
    return await _apiService.post(
      ApiConstants.frsRequestUpdate,
      body: {'reason': reason},
      includeAuth: true,
    );
  }

  Future<List<dynamic>> getPhotoUpdateRequests() async {
    return await _apiService.get(ApiConstants.frsUpdateRequests, includeAuth: true);
  }

  Future<Map<String, dynamic>> handlePhotoUpdateRequest(int requestId, String action) async {
    return await _apiService.post(
      ApiConstants.frsHandleRequest,
      body: {
        'request_id': requestId,
        'action': action,
      },
      includeAuth: true,
    );
  }

  Future<Map<String, dynamic>> clearFrsNotifications() async {
    return await _apiService.post(
      ApiConstants.frsClearNotifications,
      body: {},
      includeAuth: true,
    );
  }

  Future<List<dynamic>> getFaceRequests() async {
    return await _apiService.get(ApiConstants.frsFaceRequests, includeAuth: true);
  }

  Future<Map<String, dynamic>> handleFaceRequest(int requestId, String action, {String remarks = ''}) async {
    return await _apiService.post(
      ApiConstants.frsHandleFaceRequest,
      body: {
        'request_id': requestId,
        'action': action,
        'remarks': remarks,
      },
      includeAuth: true,
    );
  }
}
