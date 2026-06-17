import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/teacher.dart';

class TeacherSeeder {
  static final FirebaseFirestore _db = FirebaseFirestore.instance;

  static const _knownIds = {
    'p_hani', 't_sarah', 't_ali', 't_nurul', 't_raj',
    't_siti', 't_hafiz', 't_priya', 't_zarina',
  };

  static Future<void> seed() async {
    // Delete any legacy teacher documents that aren't in our known set.
    final snap = await _db.collection('teachers').get();
    for (final doc in snap.docs) {
      if (!_knownIds.contains(doc.id)) {
        await doc.reference.delete();
      }
    }

    // Always overwrite — ensures stale/incomplete docs are replaced.
    final teachers = _buildTeachers();
    for (final teacher in teachers) {
      await _db.collection('teachers').doc(teacher.id).set(teacher.toMap());
    }
  }

  static DocumentRecord _doc(
    String id,
    String name,
    String type,
    String status, {
    String rejectionReason = '',
    String uploadedAt = '2024-08-10T09:00:00.000Z',
    String verifiedAt = '',
  }) {
    return DocumentRecord(
      id: id,
      name: name,
      type: type,
      status: status,
      url: status != 'empty' ? 'https://res.cloudinary.com/dv6soku6q/image/upload/sample.pdf' : '',
      rejectionReason: rejectionReason,
      uploadedAt: status != 'empty' ? uploadedAt : '',
      verifiedAt: status == 'verified' ? '2024-08-15T10:00:00.000Z' : '',
      ocrWarnings: [],
    );
  }

  static Map<String, DocumentRecord> _allVerified() => {
        'myKad': _doc('myKad', 'Copy of Identification Card (MyKad)', 'identity', 'verified', verifiedAt: '2024-08-15T10:00:00.000Z'),
        'passportPhoto': _doc('passportPhoto', 'Passport Photo', 'photo', 'verified', verifiedAt: '2024-08-15T10:00:00.000Z'),
        'resume': _doc('resume', 'Resume / CV', 'document', 'verified', verifiedAt: '2024-08-15T10:00:00.000Z'),
        'academicCertificates': _doc('academicCertificates', 'Latest Academic Certificates', 'document', 'verified', verifiedAt: '2024-08-15T10:00:00.000Z'),
        'medicalReport': _doc('medicalReport', 'Medical Check Up Report', 'document', 'verified', verifiedAt: '2024-08-15T10:00:00.000Z'),
        'bankStatement': _doc('bankStatement', 'Bank Statement Header', 'document', 'verified', verifiedAt: '2024-08-15T10:00:00.000Z'),
      };

  static Map<String, DocumentRecord> _allUploaded() => {
        'myKad': _doc('myKad', 'Copy of Identification Card (MyKad)', 'identity', 'uploaded'),
        'passportPhoto': _doc('passportPhoto', 'Passport Photo', 'photo', 'uploaded'),
        'resume': _doc('resume', 'Resume / CV', 'document', 'uploaded'),
        'academicCertificates': _doc('academicCertificates', 'Latest Academic Certificates', 'document', 'uploaded'),
        'medicalReport': _doc('medicalReport', 'Medical Check Up Report', 'document', 'uploaded'),
        'bankStatement': _doc('bankStatement', 'Bank Statement Header', 'document', 'uploaded'),
      };

  static Map<String, DocumentRecord> _emptyDocs() => {
        'myKad': _doc('myKad', 'Copy of Identification Card (MyKad)', 'identity', 'empty'),
        'passportPhoto': _doc('passportPhoto', 'Passport Photo', 'photo', 'empty'),
        'resume': _doc('resume', 'Resume / CV', 'document', 'empty'),
        'academicCertificates': _doc('academicCertificates', 'Latest Academic Certificates', 'document', 'empty'),
        'medicalReport': _doc('medicalReport', 'Medical Check Up Report', 'document', 'empty'),
        'bankStatement': _doc('bankStatement', 'Bank Statement Header', 'document', 'empty'),
      };

  static List<TeacherRecord> _buildTeachers() {
    return [
      // ── Principal ──────────────────────────────────────────────────────────
      TeacherRecord(
        id: 'p_hani',
        username: 'hani.mohd',
        email: 'hani@school.edu.my',
        password: 'hani@2024',
        fullName: 'Dr. Hani binti Mohd',
        role: 'principal',
        icNumber: '710315-14-5678',
        gender: 'Female',
        dob: '1971-03-15',
        address: 'No. 1, Jalan Perdana, Taman Perdana, 50480 Kuala Lumpur',
        phoneNumber: '012-3001234',
        maritalStatus: 'Married',
        emergencyContactName: 'Mohd Fadzil bin Ahmad',
        emergencyContactNumber: '012-3009876',
        currentScore: 98,
        yearlyKpi: 100,
        status: 'active',
        verificationStatus: 'approved',
        documents: _allVerified(),
      ),

      // ── Teachers ───────────────────────────────────────────────────────────
      TeacherRecord(
        id: 't_sarah',
        username: 'sarah.j',
        email: 'sarah.j@school.edu.my',
        password: 'sarah@2024',
        fullName: 'Sarah Jenkins',
        role: 'teacher',
        icNumber: '890101-10-1234',
        gender: 'Female',
        dob: '1989-01-01',
        address: '123, Jalan Bahagia, Taman Maju, 47810 Petaling Jaya, Selangor',
        phoneNumber: '012-3456789',
        maritalStatus: 'Single',
        emergencyContactName: 'John Jenkins',
        emergencyContactNumber: '012-9876543',
        currentScore: 85,
        yearlyKpi: 90,
        status: 'active',
        verificationStatus: 'approved',
        documents: {
          'myKad': _doc('myKad', 'Copy of Identification Card (MyKad)', 'identity', 'verified', verifiedAt: '2024-07-20T10:00:00.000Z'),
          'passportPhoto': _doc('passportPhoto', 'Passport Photo', 'photo', 'verified', verifiedAt: '2024-07-20T10:00:00.000Z'),
          'resume': _doc('resume', 'Resume / CV', 'document', 'uploaded'),
          'academicCertificates': _doc('academicCertificates', 'Latest Academic Certificates', 'document', 'verified', verifiedAt: '2024-07-20T10:00:00.000Z'),
          'medicalReport': _doc('medicalReport', 'Medical Check Up Report', 'document', 'uploaded'),
          'bankStatement': _doc('bankStatement', 'Bank Statement Header', 'document', 'empty'),
        },
      ),

      TeacherRecord(
        id: 't_ali',
        username: 'ahmad.ali',
        email: 'ahmad.ali@school.edu.my',
        password: 'ali@2024',
        fullName: 'Ahmad Ali bin Razak',
        role: 'teacher',
        icNumber: '850620-06-3456',
        gender: 'Male',
        dob: '1985-06-20',
        address: '45, Jalan Ampang, Taman Ampang Jaya, 68000 Ampang, Selangor',
        phoneNumber: '019-7654321',
        maritalStatus: 'Married',
        emergencyContactName: 'Siti Rahimah binti Ismail',
        emergencyContactNumber: '019-1234567',
        currentScore: 78,
        yearlyKpi: 80,
        status: 'active',
        verificationStatus: 'pending',
        documents: _allUploaded(),
      ),

      TeacherRecord(
        id: 't_nurul',
        username: 'nurul.ain',
        email: 'nurul.ain@school.edu.my',
        password: 'nurul@2024',
        fullName: 'Nurul Ain binti Hassan',
        role: 'teacher',
        icNumber: '920430-08-7890',
        gender: 'Female',
        dob: '1992-04-30',
        address: '12, Lorong Damai 3, Taman Damai, 30010 Ipoh, Perak',
        phoneNumber: '011-2345678',
        maritalStatus: 'Single',
        emergencyContactName: 'Hassan bin Yusof',
        emergencyContactNumber: '011-8765432',
        currentScore: 72,
        yearlyKpi: 75,
        status: 'active',
        verificationStatus: 'pending',
        documents: {
          'myKad': _doc('myKad', 'Copy of Identification Card (MyKad)', 'identity', 'verified', verifiedAt: '2024-09-01T08:00:00.000Z'),
          'passportPhoto': _doc('passportPhoto', 'Passport Photo', 'photo', 'empty'),
          'resume': _doc('resume', 'Resume / CV', 'document', 'uploaded'),
          'academicCertificates': _doc('academicCertificates', 'Latest Academic Certificates', 'document', 'empty'),
          'medicalReport': _doc('medicalReport', 'Medical Check Up Report', 'document', 'empty'),
          'bankStatement': _doc('bankStatement', 'Bank Statement Header', 'document', 'empty'),
        },
      ),

      TeacherRecord(
        id: 't_raj',
        username: 'raj.pillai',
        email: 'raj.pillai@school.edu.my',
        password: 'raj@2024',
        fullName: 'Rajendran a/l Pillai',
        role: 'teacher',
        icNumber: '880215-01-2345',
        gender: 'Male',
        dob: '1988-02-15',
        address: '7, Jalan Masjid India, 50100 Kuala Lumpur',
        phoneNumber: '016-9876543',
        maritalStatus: 'Married',
        emergencyContactName: 'Meena a/p Pillai',
        emergencyContactNumber: '016-3456789',
        currentScore: 90,
        yearlyKpi: 92,
        status: 'active',
        verificationStatus: 'approved',
        documents: _allVerified(),
      ),

      TeacherRecord(
        id: 't_siti',
        username: 'siti.norbaya',
        email: 'siti.norbaya@school.edu.my',
        password: 'siti@2024',
        fullName: 'Siti Norbaya binti Zakaria',
        role: 'teacher',
        icNumber: '791128-07-6789',
        gender: 'Female',
        dob: '1979-11-28',
        address: '88, Jalan Penang, 10000 Georgetown, Pulau Pinang',
        phoneNumber: '014-5678901',
        maritalStatus: 'Divorced',
        emergencyContactName: 'Zakaria bin Othman',
        emergencyContactNumber: '014-1098765',
        currentScore: 65,
        yearlyKpi: 70,
        status: 'active',
        verificationStatus: 'rejected',
        verificationRejectionReason:
            'Resume submitted is blurred and unreadable. Medical report appears to be outdated (more than 6 months old). Please resubmit clear, valid documents.',
        documents: {
          'myKad': _doc('myKad', 'Copy of Identification Card (MyKad)', 'identity', 'uploaded'),
          'passportPhoto': _doc('passportPhoto', 'Passport Photo', 'photo', 'uploaded'),
          'resume': _doc('resume', 'Resume / CV', 'document', 'rejected', rejectionReason: 'Document is blurred and unreadable. Please upload a clear copy.'),
          'academicCertificates': _doc('academicCertificates', 'Latest Academic Certificates', 'document', 'uploaded'),
          'medicalReport': _doc('medicalReport', 'Medical Check Up Report', 'document', 'rejected', rejectionReason: 'Medical report is outdated (more than 6 months old). Please submit a new one.'),
          'bankStatement': _doc('bankStatement', 'Bank Statement Header', 'document', 'uploaded'),
        },
      ),

      TeacherRecord(
        id: 't_hafiz',
        username: 'hafiz.kamal',
        email: 'hafiz.kamal@school.edu.my',
        password: 'hafiz@2024',
        fullName: 'Muhammad Hafiz bin Kamal',
        role: 'teacher',
        icNumber: '950704-11-3456',
        gender: 'Male',
        dob: '1995-07-04',
        address: '23, Jalan Wangsa 5, Wangsa Maju, 53300 Kuala Lumpur',
        phoneNumber: '017-1234567',
        maritalStatus: 'Single',
        emergencyContactName: 'Kamal bin Hashim',
        emergencyContactNumber: '017-7654321',
        currentScore: 60,
        yearlyKpi: 65,
        status: 'active',
        verificationStatus: 'pending',
        documents: _emptyDocs(),
      ),

      TeacherRecord(
        id: 't_priya',
        username: 'priya.devi',
        email: 'priya.devi@school.edu.my',
        password: 'priya@2024',
        fullName: 'Priya Devi a/p Subramaniam',
        role: 'teacher',
        icNumber: '910312-05-8901',
        gender: 'Female',
        dob: '1991-03-12',
        address: '5, Jalan Bukit Bintang, 55100 Kuala Lumpur',
        phoneNumber: '013-8765432',
        maritalStatus: 'Married',
        emergencyContactName: 'Subramaniam a/l Rajan',
        emergencyContactNumber: '013-2345678',
        currentScore: 74,
        yearlyKpi: 78,
        status: 'active',
        verificationStatus: 'pending',
        documents: {
          'myKad': _doc('myKad', 'Copy of Identification Card (MyKad)', 'identity', 'uploaded'),
          'passportPhoto': _doc('passportPhoto', 'Passport Photo', 'photo', 'empty'),
          'resume': _doc('resume', 'Resume / CV', 'document', 'uploaded'),
          'academicCertificates': _doc('academicCertificates', 'Latest Academic Certificates', 'document', 'uploaded'),
          'medicalReport': _doc('medicalReport', 'Medical Check Up Report', 'document', 'empty'),
          'bankStatement': _doc('bankStatement', 'Bank Statement Header', 'document', 'empty'),
        },
      ),

      TeacherRecord(
        id: 't_zarina',
        username: 'zarina.ab',
        email: 'zarina.ab@school.edu.my',
        password: 'zarina@2024',
        fullName: 'Zarina binti Abdullah',
        role: 'teacher',
        icNumber: '830918-14-2345',
        gender: 'Female',
        dob: '1983-09-18',
        address: '34, Persiaran Utama, Bandar Sri Damansara, 52200 Kuala Lumpur',
        phoneNumber: '018-6543210',
        maritalStatus: 'Married',
        emergencyContactName: 'Mohd Yazid bin Kassim',
        emergencyContactNumber: '018-0123456',
        currentScore: 88,
        yearlyKpi: 88,
        status: 'active',
        verificationStatus: 'approved',
        documents: {
          'myKad': _doc('myKad', 'Copy of Identification Card (MyKad)', 'identity', 'verified', verifiedAt: '2024-06-10T10:00:00.000Z'),
          'passportPhoto': _doc('passportPhoto', 'Passport Photo', 'photo', 'verified', verifiedAt: '2024-06-10T10:00:00.000Z'),
          'resume': _doc('resume', 'Resume / CV', 'document', 'verified', verifiedAt: '2024-06-10T10:00:00.000Z'),
          'academicCertificates': _doc('academicCertificates', 'Latest Academic Certificates', 'document', 'verified', verifiedAt: '2024-06-10T10:00:00.000Z'),
          'medicalReport': _doc('medicalReport', 'Medical Check Up Report', 'document', 'uploaded'),
          'bankStatement': _doc('bankStatement', 'Bank Statement Header', 'document', 'uploaded'),
        },
      ),
    ];
  }
}
