import 'dart:convert';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:http/http.dart' as http;
import '../models/teacher.dart';
import '../models/change_request.dart';

const _projectId = 'teacher-management-syste-f8043';

// Converts a Firestore REST field value (typed wrapper) to a plain Dart value.
dynamic _fromRestValue(dynamic val) {
  if (val is! Map) return val;
  final v = Map<String, dynamic>.from(val);
  if (v.containsKey('stringValue')) return v['stringValue'];
  if (v.containsKey('integerValue')) return int.tryParse(v['integerValue'].toString()) ?? 0;
  if (v.containsKey('doubleValue')) return (v['doubleValue'] as num).toDouble();
  if (v.containsKey('booleanValue')) return v['booleanValue'];
  if (v.containsKey('timestampValue')) return v['timestampValue'];
  if (v.containsKey('nullValue')) return null;
  if (v.containsKey('mapValue')) {
    final fields = (v['mapValue'] as Map)['fields'] as Map? ?? {};
    return Map<String, dynamic>.fromEntries(
      fields.entries.map((e) => MapEntry(e.key as String, _fromRestValue(e.value))),
    );
  }
  if (v.containsKey('arrayValue')) {
    final values = (v['arrayValue'] as Map)['values'] as List? ?? [];
    return values.map(_fromRestValue).toList();
  }
  return null;
}

Future<List<TeacherRecord>> _fetchTeachersRest() async {
  final uri = Uri.parse(
    'https://firestore.googleapis.com/v1/projects/$_projectId'
    '/databases/(default)/documents/teachers',
  );
  final res = await http.get(uri).timeout(const Duration(seconds: 10));
  if (res.statusCode != 200) return [];
  final body = json.decode(res.body) as Map<String, dynamic>;
  final docs = body['documents'] as List? ?? [];
  return docs.map((doc) {
    final id = (doc['name'] as String).split('/').last;
    final fields = Map<String, dynamic>.fromEntries(
      ((doc['fields'] as Map?) ?? {})
          .entries
          .map((e) => MapEntry(e.key as String, _fromRestValue(e.value))),
    );
    return TeacherRecord.fromMap(id, fields);
  }).toList();
}

class TeacherService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  // ── Queries ────────────────────────────────────────────────────────────────

  Stream<List<TeacherRecord>> getTeachers() async* {
    // REST fetch first — bypasses gRPC so it works on Android devices where
    // the Firestore gRPC backend is unreachable but standard HTTPS works fine.
    try {
      final list = await _fetchTeachersRest();
      if (list.isNotEmpty) yield list;
    } catch (_) {}
    // Then emit real-time updates via the SDK stream.
    yield* _db.collection('teachers').snapshots().map(
          (s) => s.docs.map((d) => TeacherRecord.fromMap(d.id, d.data())).toList(),
        );
  }

  Stream<TeacherRecord?> getTeacherStream(String id) {
    return _db.collection('teachers').doc(id).snapshots().map((doc) {
      if (!doc.exists) return null;
      return TeacherRecord.fromMap(doc.id, doc.data()!);
    });
  }

  Future<TeacherRecord?> getTeacherById(String id) async {
    final doc = await _db.collection('teachers').doc(id).get();
    if (!doc.exists) return null;
    return TeacherRecord.fromMap(doc.id, doc.data()!);
  }

  // ── Teacher profile mutations ──────────────────────────────────────────────

  Future<void> updateTeacher(TeacherRecord teacher) async {
    await _db.collection('teachers').doc(teacher.id).set(teacher.toMap());
  }

  /// Only updates the fields teachers are allowed to change themselves.
  Future<void> updateTeacherProfile(String id, Map<String, dynamic> fields) async {
    const allowed = {
      'phoneNumber', 'email', 'address', 'maritalStatus',
      'emergencyContactName', 'emergencyContactNumber',
    };
    final safe = Map.fromEntries(
      fields.entries.where((e) => allowed.contains(e.key)),
    );
    if (safe.isNotEmpty) {
      await _db.collection('teachers').doc(id).update(safe);
    }
  }

  /// Admin can update any field on a teacher document.
  Future<void> adminUpdateTeacher(String id, Map<String, dynamic> fields) async {
    await _db.collection('teachers').doc(id).set(fields, SetOptions(merge: true));
  }

  // ── Document management ───────────────────────────────────────────────────

  Future<void> updateDocumentStatus(
    String teacherId,
    String docKey,
    String status, {
    String rejectionReason = '',
    String url = '',
    List<String> ocrWarnings = const [],
  }) async {
    final now = DateTime.now().toIso8601String();
    final data = <String, dynamic>{
      'documents.$docKey.status': status,
      'documents.$docKey.rejectionReason': rejectionReason,
      'documents.$docKey.ocrWarnings': ocrWarnings,
    };
    if (url.isNotEmpty) {
      data['documents.$docKey.url'] = url;
      data['documents.$docKey.uploadedAt'] = now;
    }
    if (status == 'verified') {
      data['documents.$docKey.verifiedAt'] = now;
    }
    await _db.collection('teachers').doc(teacherId).update(data);
  }

  // ── Verification status ───────────────────────────────────────────────────

  Future<void> updateVerificationStatus(
    String teacherId,
    String status, {
    String rejectionReason = '',
  }) async {
    await _db.collection('teachers').doc(teacherId).update({
      'verificationStatus': status,
      'verificationRejectionReason': rejectionReason,
    });
  }

  // ── Change requests ───────────────────────────────────────────────────────

  Future<void> submitChangeRequest(ChangeRequest request) async {
    await _db.collection('change_requests').doc(request.id).set(request.toMap());
  }

  Stream<List<ChangeRequest>> getChangeRequestsForTeacher(String teacherId) {
    return _db
        .collection('change_requests')
        .where('teacherId', isEqualTo: teacherId)
        .orderBy('submittedAt', descending: true)
        .snapshots()
        .map((s) => s.docs
            .map((d) => ChangeRequest.fromMap(d.id, d.data()))
            .toList());
  }

  Stream<List<ChangeRequest>> getAllChangeRequests() {
    return _db
        .collection('change_requests')
        .orderBy('submittedAt', descending: true)
        .snapshots()
        .map((s) => s.docs
            .map((d) => ChangeRequest.fromMap(d.id, d.data()))
            .toList());
  }

  Future<void> reviewChangeRequest(
    String requestId,
    String teacherId,
    String field,
    String newValue,
    bool approved, {
    String rejectionReason = '',
    String reviewedBy = '',
  }) async {
    final now = DateTime.now().toIso8601String();
    await _db.collection('change_requests').doc(requestId).update({
      'status': approved ? 'approved' : 'rejected',
      'rejectionReason': rejectionReason,
      'reviewedAt': now,
      'reviewedBy': reviewedBy,
    });
    if (approved) {
      await _db.collection('teachers').doc(teacherId).update({field: newValue});
    }
  }
}
