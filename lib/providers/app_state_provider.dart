import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../modules/teachers/models/teacher.dart';
import '../modules/teachers/services/teacher_service.dart';

class AppStateProvider extends ChangeNotifier {
  final TeacherService _teacherService = TeacherService();

  TeacherRecord? _currentUser;
  bool _isLoading = true;

  TeacherRecord? get currentUser => _currentUser;
  bool get isLoading => _isLoading;

  AppStateProvider() {
    _loadSession();
  }

  Future<void> _loadSession() async {
    final prefs = await SharedPreferences.getInstance();
    final userId = prefs.getString('current_user_id');
    if (userId != null) {
      _currentUser = await _teacherService.getTeacherById(userId);
    }
    _isLoading = false;
    notifyListeners();
  }

  /// Returns null on success, or an error message string on failure.
  Future<String?> login(String email, String password) async {
    _isLoading = true;
    notifyListeners();

    try {
      final snapshot = await FirebaseFirestore.instance
          .collection('teachers')
          .where('email', isEqualTo: email.trim().toLowerCase())
          .limit(1)
          .get();

      if (snapshot.docs.isEmpty) {
        _isLoading = false;
        notifyListeners();
        return 'No account found with this email address.';
      }

      final doc = snapshot.docs.first;
      final teacher = TeacherRecord.fromMap(doc.id, doc.data());

      if (teacher.password != password) {
        _isLoading = false;
        notifyListeners();
        return 'Incorrect password.';
      }

      _currentUser = teacher;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('current_user_id', teacher.id);
      _isLoading = false;
      notifyListeners();
      return null;
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      return 'Login failed. Please try again.';
    }
  }

  void updateCurrentUser(TeacherRecord teacher) {
    _currentUser = teacher;
    notifyListeners();
  }

  Future<void> refreshCurrentUser() async {
    if (_currentUser == null) return;
    final updated = await _teacherService.getTeacherById(_currentUser!.id);
    if (updated != null) {
      _currentUser = updated;
      notifyListeners();
    }
  }

  /// Legacy: used by the dropdown login screen to log in directly with a TeacherRecord.
  Future<void> loginAs(TeacherRecord teacher) async {
    _currentUser = teacher;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('current_user_id', teacher.id);
    notifyListeners();
  }

  Future<void> logout() async {
    _currentUser = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('current_user_id');
    notifyListeners();
  }
}
