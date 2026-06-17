import 'dart:convert';
import 'package:http/http.dart' as http;

class CloudinaryService {
  static const String _cloudName = 'dv6soku6q';
  static const String _uploadPreset = 'teacher-management-system';

  static Future<String?> uploadFile(
    List<int> fileBytes,
    String fileName, {
    String folder = 'teacher-documents',
  }) async {
    try {
      final uri = Uri.parse(
        'https://api.cloudinary.com/v1_1/$_cloudName/auto/upload',
      );

      final request = http.MultipartRequest('POST', uri)
        ..fields['upload_preset'] = _uploadPreset
        ..fields['folder'] = folder
        ..files.add(
          http.MultipartFile.fromBytes('file', fileBytes, filename: fileName),
        );

      final streamed = await request.send();
      final response = await http.Response.fromStream(streamed);

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        return json['secure_url'] as String?;
      }
      return null;
    } catch (_) {
      return null;
    }
  }
}
