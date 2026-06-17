// OCR validation service.
// On Android/iOS, wire in google_mlkit_text_recognition for real extraction.
// On Windows/Web this returns no warnings so uploads proceed normally.
import 'dart:io';
import 'package:flutter/foundation.dart';

class OcrService {
  static bool get isSupported =>
      !kIsWeb && (Platform.isAndroid || Platform.isIOS || Platform.isMacOS);

  static Future<List<String>> validateDocument({
    required String? imagePath,
    required String docType,
    required String teacherName,
    required String icNumber,
    required String dob,
  }) async {
    if (!isSupported || imagePath == null || imagePath.isEmpty) return [];

    // To enable on mobile:
    // 1. Add google_mlkit_text_recognition: ^0.13.0 to pubspec.yaml
    // 2. Set Android minSdkVersion to 21 in android/app/build.gradle
    // 3. Uncomment the block below:
    //
    // final recognizer = TextRecognizer(script: TextRecognitionScript.latin);
    // final inputImage = InputImage.fromFilePath(imagePath);
    // final result = await recognizer.processImage(inputImage);
    // await recognizer.close();
    // final raw = result.text.toLowerCase();
    // final warnings = <String>[];
    //
    // if (docType == 'myKad') {
    //   final nameParts = teacherName.toLowerCase().split(' ');
    //   if (!nameParts.any((p) => p.length > 2 && raw.contains(p))) {
    //     warnings.add('Name on MyKad does not match: "$teacherName"');
    //   }
    //   final cleanIc = icNumber.replaceAll('-', '');
    //   if (!raw.replaceAll(' ', '').contains(cleanIc)) {
    //     warnings.add('IC Number on MyKad does not match: "$icNumber"');
    //   }
    // } else if (docType == 'bankStatement' || docType == 'academicCertificates') {
    //   final nameParts = teacherName.toLowerCase().split(' ');
    //   if (!nameParts.any((p) => p.length > 2 && raw.contains(p))) {
    //     warnings.add('Name on document does not match: "$teacherName"');
    //   }
    // }
    // return warnings;

    return [];
  }
}
