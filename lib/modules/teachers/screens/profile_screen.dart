import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:file_picker/file_picker.dart';

import '../models/teacher.dart';
import '../../../app_theme.dart';

class ProfileScreen extends StatelessWidget {
  final TeacherRecord user;
  const ProfileScreen({Key? key, required this.user}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: AppTheme.primaryColor, borderRadius: BorderRadius.circular(16)),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 30,
                  backgroundColor: Colors.white,
                  child: Text(user.fullName[0], style: const TextStyle(fontSize: 24, color: AppTheme.primaryColor)),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(user.fullName, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 20)),
                      Text(user.role, style: TextStyle(color: Colors.white.withOpacity(0.8))),
                      const SizedBox(height: 8),
                      LinearProgressIndicator(
                        value: user.completionProgress / 100,
                        backgroundColor: Colors.black26,
                        valueColor: const AlwaysStoppedAnimation(Colors.white),
                      ),
                      const SizedBox(height: 4),
                      Text('Profile ${user.completionProgress}% Complete', style: const TextStyle(color: Colors.white, fontSize: 12)),
                    ],
                  ),
                )
              ],
            ),
          ),
          const SizedBox(height: 24),
          const Text('Basic Information', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          _buildTextField('Address', user.address),
          const SizedBox(height: 12),
          _buildTextField('Phone Number', user.phoneNumber),
          const SizedBox(height: 12),
          _buildTextField('Emergency Contact', user.emergencyContactName),
          const SizedBox(height: 32),
          const Text('Corporate Documents', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          _buildDocCard('MyKad', user.documents['myKad']),
          _buildDocCard('Resume', user.documents['resume']),
          _buildDocCard('Medical Checkup', user.documents['medicalReport']),
        ],
      ),
    );
  }

  Widget _buildTextField(String label, String value) {
    return TextField(
      controller: TextEditingController(text: value),
      decoration: InputDecoration(
        labelText: label,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        filled: true,
        fillColor: Colors.white,
      ),
    );
  }

  Widget _buildDocCard(String title, DocumentRecord? doc) {
    bool isUploaded = doc != null && doc.status != 'empty';
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: Color(0xFFF0EFEC))),
      child: ListTile(
        leading: Icon(LucideIcons.fileText, color: isUploaded ? Colors.green : Colors.grey),
        title: Text(title),
        subtitle: Text(isUploaded ? 'Uploaded' : 'Missing', style: TextStyle(color: isUploaded ? Colors.green : Colors.red)),
        trailing: ElevatedButton(
          onPressed: () async {
            await FilePicker.platform.pickFiles();
          },
          child: const Text('Upload'),
        ),
      ),
    );
  }
}