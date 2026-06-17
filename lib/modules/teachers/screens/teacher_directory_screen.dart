import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../models/teacher.dart';
import '../services/teacher_service.dart';
import '../../../app_theme.dart';

class TeacherDirectoryScreen extends StatelessWidget {
  const TeacherDirectoryScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final TeacherService db = TeacherService();

    return StreamBuilder<List<TeacherRecord>>(
      stream: db.getTeachers(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
        if (!snapshot.hasData) return const Center(child: Text("No data."));

        final teachers = snapshot.data!.where((t) => t.role != 'principal' && t.role != 'admin').toList();

        return SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Overview', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              Row(
                children: [
                  _buildStatCard('Total Teachers', teachers.length.toString(), LucideIcons.users),
                  const SizedBox(width: 16),
                  _buildStatCard('Active Leaves', '2', LucideIcons.calendarOff),
                  const SizedBox(width: 16),
                  _buildStatCard('Resolved Incidents', '14', LucideIcons.checkCircle),
                  const SizedBox(width: 16),
                  _buildStatCard('Duty Completion %', '92%', LucideIcons.checkSquare),
                ],
              ),
              const SizedBox(height: 32),
              const Text('Faculty Directory', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: teachers.length,
                itemBuilder: (context, index) {
                  final t = teachers[index];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: const BorderSide(color: Color(0xFFF0EFEC)),
                    ),
                    child: ListTile(
                      leading: CircleAvatar(child: Text(t.fullName[0])),
                      title: Text(t.fullName, style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text('${t.role} • KPI: ${t.currentScore}/100 • Profile: ${t.completionProgress}%'),
                      trailing: const Icon(LucideIcons.chevronRight),
                      onTap: () => _showTeacherModal(context, t),
                    ),
                  );
                },
              )
            ],
          ),
        );
      },
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFF0EFEC)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: AppTheme.primaryColor),
            const SizedBox(height: 12),
            Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text(title, style: const TextStyle(fontSize: 12, color: Colors.grey)),
          ],
        ),
      ),
    );
  }

  void _showTeacherModal(BuildContext context, TeacherRecord t) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(t.fullName),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Email: ${t.email}'),
            Text('Phone: ${t.phoneNumber}'),
            Text('Emergency Contact: ${t.emergencyContactName} (${t.emergencyContactNumber})'),
            const SizedBox(height: 16),
            const Text('Documents:'),
            ...t.documents.entries.map((e) => Text('- ${e.key}: ${e.value.status}')).toList(),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close')),
        ],
      )
    );
  }
}