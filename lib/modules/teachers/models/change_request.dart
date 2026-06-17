class ChangeRequest {
  final String id;
  final String teacherId;
  final String teacherName;
  final String field; // 'fullName', 'icNumber', 'gender', 'dob'
  final String oldValue;
  final String newValue;
  final String documentUrl;
  final String status; // 'pending', 'approved', 'rejected'
  final String rejectionReason;
  final String submittedAt;
  final String reviewedAt;
  final String reviewedBy;

  ChangeRequest({
    required this.id,
    required this.teacherId,
    required this.teacherName,
    required this.field,
    required this.oldValue,
    required this.newValue,
    this.documentUrl = '',
    this.status = 'pending',
    this.rejectionReason = '',
    required this.submittedAt,
    this.reviewedAt = '',
    this.reviewedBy = '',
  });

  String get fieldLabel {
    switch (field) {
      case 'fullName':
        return 'Full Name';
      case 'icNumber':
        return 'IC Number';
      case 'gender':
        return 'Gender';
      case 'dob':
        return 'Date of Birth';
      default:
        return field;
    }
  }

  factory ChangeRequest.fromMap(String id, Map<String, dynamic> data) {
    return ChangeRequest(
      id: id,
      teacherId: data['teacherId'] ?? '',
      teacherName: data['teacherName'] ?? '',
      field: data['field'] ?? '',
      oldValue: data['oldValue'] ?? '',
      newValue: data['newValue'] ?? '',
      documentUrl: data['documentUrl'] ?? '',
      status: data['status'] ?? 'pending',
      rejectionReason: data['rejectionReason'] ?? '',
      submittedAt: data['submittedAt'] ?? '',
      reviewedAt: data['reviewedAt'] ?? '',
      reviewedBy: data['reviewedBy'] ?? '',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'teacherId': teacherId,
      'teacherName': teacherName,
      'field': field,
      'oldValue': oldValue,
      'newValue': newValue,
      'documentUrl': documentUrl,
      'status': status,
      'rejectionReason': rejectionReason,
      'submittedAt': submittedAt,
      'reviewedAt': reviewedAt,
      'reviewedBy': reviewedBy,
    };
  }
}
