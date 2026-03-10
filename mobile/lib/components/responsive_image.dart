import 'dart:convert';
import 'package:flutter/material.dart';
import '../constants/api_constants.dart';

class ResponsiveImage extends StatelessWidget {
  final String? imageData;
  final double? width;
  final double? height;
  final BoxFit fit;
  final Widget? placeholder;

  const ResponsiveImage({
    super.key,
    this.imageData,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.placeholder,
  });

  @override
  Widget build(BuildContext context) {
    if (imageData == null || imageData!.isEmpty) {
      return placeholder ?? _defaultPlaceholder();
    }

    // Common Base64 signatures for images:
    // JPEG starts with /9j/
    // PNG starts with iVBOR
    // WebP starts with UklG
    bool isBase64 =
        imageData!.startsWith('data:image') ||
        imageData!.startsWith('/9j/') ||
        imageData!.startsWith('iVBOR') ||
        imageData!.startsWith('UklG') ||
        (imageData!.length > 500 && !imageData!.contains(' '));

    if (isBase64) {
      try {
        String cleanData = imageData!;
        if (cleanData.contains('base64,')) {
          cleanData = cleanData.split('base64,')[1];
        }
        return Image.memory(
          base64Decode(cleanData),
          width: width,
          height: height,
          fit: fit,
          errorBuilder: (context, error, stackTrace) => _errorWidget(),
        );
      } catch (e) {
        return _errorWidget();
      }
    }

    // Otherwise treat as URL
    String photoUrl = imageData!;
    if (!photoUrl.startsWith('http') && !photoUrl.startsWith('assets/')) {
      String base = ApiConstants.baseUrl;
      if (base.endsWith('/')) base = base.substring(0, base.length - 1);

      if (photoUrl.startsWith('/')) {
        photoUrl = "$base$photoUrl";
      } else {
        // It's likely a media path from legacy records like 'attendance_captures/...'
        photoUrl = "$base/media/$photoUrl";
      }
    }

    return Image.network(
      photoUrl,
      width: width,
      height: height,
      fit: fit,
      errorBuilder: (context, error, stackTrace) => _errorWidget(),
    );
  }

  Widget _defaultPlaceholder() {
    return Container(
      width: width,
      height: height,
      color: const Color(0xFFF8FAFC),
      child: const Icon(Icons.person, size: 40, color: Color(0xFF94A3B8)),
    );
  }

  Widget _errorWidget() {
    return Container(
      width: width,
      height: height,
      color: const Color(0xFFF8FAFC),
      child: const Icon(
        Icons.broken_image_rounded,
        size: 30,
        color: Color(0xFF94A3B8),
      ),
    );
  }
}
