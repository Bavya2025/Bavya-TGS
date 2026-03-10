import 'dart:convert';
import 'dart:io';
import 'package:camera/camera.dart';
import 'package:image/image.dart' as img; // Add image package import
import '../constants/api_constants.dart';
import 'api_service.dart';

class FrsService {
  final ApiService _apiService = ApiService();

  Future<String> _compressImage(XFile imageFile) async {
    try {
      final bytes = await imageFile.readAsBytes();
      var decodedImage = img.decodeImage(bytes);
      if (decodedImage == null) return base64.encode(bytes);

      // CRITICAL: Handle EXIF orientation (upright alignment)
      decodedImage = img.bakeOrientation(decodedImage);

      // Resize to max 800px width for FRS (plenty for detection)
      img.Image resized;
      if (decodedImage.width > 800) {
        resized = img.copyResize(decodedImage, width: 800);
      } else {
        resized = decodedImage;
      }

      // Convert to JPEG with 85% quality - drastically reduces Base64 size while keeping details
      final compressedBytes = img.encodeJpg(resized, quality: 85);
      return base64.encode(compressedBytes);
    } catch (e) {
      // Fallback to raw if compression fails
      final bytes = await imageFile.readAsBytes();
      return base64.encode(bytes);
    }
  }

  Future<Map<String, dynamic>> enrollFace(XFile imageFile) async {
    try {
      final base64Image = await _compressImage(imageFile);

      return await _apiService.post(
        ApiConstants.frsEnroll,
        body: {'face_image': base64Image},
        includeAuth: true,
      );
    } catch (e) {
      throw Exception('Face enrollment failed: $e');
    }
  }

  Future<Map<String, dynamic>> verifyFace(
    XFile imageFile, {
    double? lat,
    double? lng,
    String? address,
  }) async {
    try {
      final base64Image = await _compressImage(imageFile);

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

  Future<Map<String, dynamic>> handleApproval(
    int attendanceId,
    String action,
    String remarks,
  ) async {
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
    return await _apiService.get(
      ApiConstants.frsUpdateRequests,
      includeAuth: true,
    );
  }

  Future<Map<String, dynamic>> handlePhotoUpdateRequest(
    int requestId,
    String action,
  ) async {
    return await _apiService.post(
      ApiConstants.frsHandleRequest,
      body: {'request_id': requestId, 'action': action},
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
    return await _apiService.get(
      ApiConstants.frsFaceRequests,
      includeAuth: true,
    );
  }

  Future<Map<String, dynamic>> handleFaceRequest(
    int requestId,
    String action, {
    String remarks = '',
  }) async {
    return await _apiService.post(
      ApiConstants.frsHandleFaceRequest,
      body: {'request_id': requestId, 'action': action, 'remarks': remarks},
      includeAuth: true,
    );
  }
}
