import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import '../../modules/duty/models/duty.dart';
import '../../modules/teachers/services/teacher_seeder.dart';

class DatabaseSeeder {
  static final FirebaseFirestore _db = FirebaseFirestore.instance;
  // Bump this string to force a full reseed on next app launch.
  static const String _seedVersion = '2.1';

  static Future<void> seedDatabase() async {
    try {
      final configDoc = await _db.collection('_config').doc('seed').get();
      if (configDoc.exists && configDoc.data()?['version'] == _seedVersion) {
        return;
      }

      await TeacherSeeder.seed();
      await _seedLocations();
      await _seedTasks();

      await _db.collection('_config').doc('seed').set({
        'version': _seedVersion,
        'seededAt': FieldValue.serverTimestamp(),
      });

      debugPrint('Database seeding v$_seedVersion complete.');
    } catch (e) {
      debugPrint('Error seeding database: $e');
    }
  }

  static Future<void> _seedLocations() async {
    final snap = await _db.collection('duty_locations').limit(1).get();
    if (snap.docs.isNotEmpty) return;

    final batch = _db.batch();
    final locs = [
      DutyLocation(id: 'loc_hall', name: 'Assembly Hall', description: 'Main gathering hall'),
      DutyLocation(id: 'loc_gate', name: 'Main Gate', description: 'Front entrance'),
      DutyLocation(id: 'loc_canteen', name: 'Canteen', description: 'School cafeteria area'),
      DutyLocation(id: 'loc_carpark', name: 'Car Park', description: 'Student drop-off car park'),
    ];
    for (final loc in locs) {
      batch.set(_db.collection('duty_locations').doc(loc.id), loc.toMap());
    }
    await batch.commit();
  }

  static Future<void> _seedTasks() async {
    final snap = await _db.collection('duty_tasks').limit(1).get();
    if (snap.docs.isNotEmpty) return;

    final batch = _db.batch();
    final tasks = [
      DutyTask(
        id: 'task_arrival',
        name: 'Morning Arrival',
        timeStart: '07:00',
        timeEnd: '07:30',
        frequency: 'Daily',
        locations: ['loc_gate'],
        minPeople: 2,
        checklistTemplates: ['Greet students', 'Check uniform', 'Monitor traffic'],
      ),
      DutyTask(
        id: 'task_recess',
        name: 'Recess Supervision',
        timeStart: '10:00',
        timeEnd: '10:30',
        frequency: 'Daily',
        locations: ['loc_canteen'],
        minPeople: 3,
        checklistTemplates: ['Monitor canteen queue', 'Ensure cleanliness', 'Check student behaviour'],
      ),
      DutyTask(
        id: 'task_dismissal',
        name: 'School Dismissal',
        timeStart: '13:00',
        timeEnd: '13:30',
        frequency: 'Daily',
        locations: ['loc_gate', 'loc_carpark'],
        minPeople: 4,
        checklistTemplates: ['Guide students to vehicles', 'Monitor car park traffic', 'Ensure all students are collected'],
      ),
    ];
    for (final task in tasks) {
      batch.set(_db.collection('duty_tasks').doc(task.id), task.toMap());
    }
    await batch.commit();
  }
}
