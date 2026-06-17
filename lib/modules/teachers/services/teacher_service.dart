import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/teacher.dart';
import '../models/change_request.dart';

class TeacherService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  // ── Queries ────────────────────────────────────────────────────────────────

  Stream<List<TeacherRecord>> getTeachers() {
    return _db.collection('teachers').snapshots().map(
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
    await _db.collection('teachers').doc(id).update(fields);
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
