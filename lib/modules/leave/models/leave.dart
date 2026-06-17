import 'package:cloud_firestore/cloud_firestore.dart';

enum LeaveType {
  annual,
  medical,
  unpaid,
  maternity,
  marriage,
  compassionate,
  umrah,
  haji,
  birthday,
  halfday,
  sick,
  emergency,
  other
}

extension LeaveTypeExtension on LeaveType {
  String get name {
    switch (this) {
      case LeaveType.annual: return 'Annual Leave';
      case LeaveType.medical: return 'Medical Leave (MC)';
      case LeaveType.unpaid: return 'Unpaid Leave';
      case LeaveType.maternity: return 'Maternity Leave';
      case LeaveType.marriage: return 'Marriage Leave';
      case LeaveType.compassionate: return 'Compassionate Leave';
      case LeaveType.umrah: return 'Umrah Leave';
      case LeaveType.haji: return 'Haji Leave';
      case LeaveType.birthday: return 'Birthday Leave';
      case LeaveType.halfday: return 'Half Day Leave';
      case LeaveType.sick: return 'Sick Leave';
      case LeaveType.emergency: return 'Emergency Leave';
      case LeaveType.other: return 'Other Leave';
    }
  }

  String get dbValue {
    return toString().split('.').last;
  }

  static LeaveType fromDbValue(String value) {
    return LeaveType.values.firstWhere(
      (e) => e.dbValue == value,
      orElse: () => LeaveType.other,
    );
  }
}

class LeaveRecord {
  final String id;
  final String teacherId;
  final String teacherName;
  final String startDate; // YYYY-MM-DD
  final String endDate;   // YYYY-MM-DD
  final double duration;   // days
  final LeaveType type;
  final String status;    // pending, approved, rejected
  final String? documentUrl;
  final String? documentName;
  final String? remarks;
  final String? principalNotes;
  final DateTime? createdAt;

  LeaveRecord({
    required this.id,
    required this.teacherId,
    required this.teacherName,
    required this.startDate,
    required this.endDate,
    required this.duration,
    required this.type,
    required this.status,
    this.documentUrl,
    this.documentName,
    this.remarks,
    this.principalNotes,
    this.createdAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'teacherId': teacherId,
      'teacherName': teacherName,
      'startDate': startDate,
      'endDate': endDate,
      'duration': duration,
      'type': type.dbValue,
      'status': status,
      'documentUrl': documentUrl,
      'documentName': documentName,
      'remarks': remarks,
      'principalNotes': principalNotes,
      'createdAt': createdAt != null ? Timestamp.fromDate(createdAt!) : FieldValue.serverTimestamp(),
    };
  }

  factory LeaveRecord.fromMap(Map<String, dynamic> map, String id) {
    DateTime? created;
    if (map['createdAt'] is Timestamp) {
      created = (map['createdAt'] as Timestamp).toDate();
    }

    return LeaveRecord(
      id: id,
      teacherId: map['teacherId'] ?? '',
      teacherName: map['teacherName'] ?? '',
      startDate: map['startDate'] ?? '',
      endDate: map['endDate'] ?? '',
      duration: (map['duration'] as num?)?.toDouble() ?? 1.0,
      type: LeaveTypeExtension.fromDbValue(map['type'] ?? 'other'),
      status: map['status'] ?? 'pending',
      documentUrl: map['documentUrl'],
      documentName: map['documentName'],
      remarks: map['remarks'],
      principalNotes: map['principalNotes'],
      createdAt: created,
    );
  }
}

class TeacherDocument {
  final String id;
  final String name;
  final String type;
  final String status; // empty, uploaded, verified
  final String? url;

  TeacherDocument({
    required this.id,
    required this.name,
    required this.type,
    required this.status,
    this.url,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'type': type,
      'status': status,
      'url': url,
    };
  }

  factory TeacherDocument.fromMap(Map<String, dynamic> map) {
    return TeacherDocument(
      id: map['id'] ?? '',
      name: map['name'] ?? '',
      type: map['type'] ?? '',
      status: map['status'] ?? 'empty',
      url: map['url'],
    );
  }
}

class TeacherRecord {
  final String id;
  final String username;
  final String email;
  final String fullName;
  final String role; // teacher, principal
  final String icNumber;
  final String gender;
  final String dob;
  final String address;
  final String phoneNumber;
  final String maritalStatus;
  final String emergencyContactName;
  final String emergencyContactNumber;
  final Map<String, TeacherDocument> documents;
  final int completionProgress;
  final int currentScore;
  final int yearlyKpi;
  final String status; // active, terminated

  TeacherRecord({
    required this.id,
    required this.username,
    required this.email,
    required this.fullName,
    required this.role,
    required this.icNumber,
    required this.gender,
    required this.dob,
    required this.address,
    required this.phoneNumber,
    required this.maritalStatus,
    required this.emergencyContactName,
    required this.emergencyContactNumber,
    required this.documents,
    required this.completionProgress,
    required this.currentScore,
    required this.yearlyKpi,
    required this.status,
  });

  Map<String, dynamic> toMap() {
    return {
      'username': username,
      'email': email,
      'fullName': fullName,
      'role': role,
      'icNumber': icNumber,
      'gender': gender,
      'dob': dob,
      'address': address,
      'phoneNumber': phoneNumber,
      'maritalStatus': maritalStatus,
      'emergencyContactName': emergencyContactName,
      'emergencyContactNumber': emergencyContactNumber,
      'documents': documents.map((k, v) => MapEntry(k, v.toMap())),
      'completionProgress': completionProgress,
      'currentScore': currentScore,
      'yearlyKpi': yearlyKpi,
      'status': status,
    };
  }

  factory TeacherRecord.fromMap(Map<String, dynamic> map, String id) {
    final docsMap = map['documents'] as Map<String, dynamic>? ?? {};
    final documents = docsMap.map((k, v) => MapEntry(
          k,
          TeacherDocument.fromMap(Map<String, dynamic>.from(v)),
        ));

    return TeacherRecord(
      id: id,
      username: map['username'] ?? '',
      email: map['email'] ?? '',
      fullName: map['fullName'] ?? '',
      role: map['role'] ?? 'teacher',
      icNumber: map['icNumber'] ?? '',
      gender: map['gender'] ?? '',
      dob: map['dob'] ?? '',
      address: map['address'] ?? '',
      phoneNumber: map['phoneNumber'] ?? '',
      maritalStatus: map['maritalStatus'] ?? '',
      emergencyContactName: map['emergencyContactName'] ?? '',
      emergencyContactNumber: map['emergencyContactNumber'] ?? '',
      documents: Map<String, TeacherDocument>.from(documents),
      completionProgress: map['completionProgress'] ?? 0,
      currentScore: map['currentScore'] ?? 0,
      yearlyKpi: map['yearlyKpi'] ?? 0,
      status: map['status'] ?? 'active',
    );
  }
}