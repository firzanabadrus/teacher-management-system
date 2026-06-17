import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../models/training.dart';
import '../services/training_service.dart';
import '../../../modules/teachers/models/teacher.dart';
import '../../../modules/teachers/services/teacher_service.dart';
import '../../../app_theme.dart';

class AdminTrainingScreen extends StatefulWidget {
  final TeacherRecord user;
  const AdminTrainingScreen({Key? key, required this.user}) : super(key: key);

  @override
  State<AdminTrainingScreen> createState() => _AdminTrainingScreenState();
}

class _AdminTrainingScreenState extends State<AdminTrainingScreen> {
  final TrainingService _trainingService = TrainingService();
  final TeacherService _teacherService = TeacherService();

  bool _isCpd = false;
  String _recruitmentType = 'Open for Volunteers';
  final List<String> _selectedTraineeIds = [];

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(24),
          color: Colors.white,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Create Post / CPD Session', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              const TextField(
                maxLines: 2,
                decoration: InputDecoration(border: OutlineInputBorder(), hintText: 'Content...'),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Checkbox(value: _isCpd, onChanged: (v) => setState(() => _isCpd = v ?? false)),
                  const Text('Is this a Training/CPD Session?'),
                ],
              ),
              if (_isCpd) ...[
                const SizedBox(height: 12),
                const TextField(decoration: InputDecoration(labelText: 'Course Title', border: OutlineInputBorder())),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Expanded(child: TextField(decoration: InputDecoration(labelText: 'Max Seats', border: OutlineInputBorder()))),
                    const SizedBox(width: 16),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _recruitmentType,
                        items: ['Open for Volunteers', 'Assign Trainees']
                            .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                            .toList(),
                        onChanged: (v) => setState(() => _recruitmentType = v!),
                        decoration: const InputDecoration(border: OutlineInputBorder()),
                      ),
                    ),
                  ],
                ),
                if (_recruitmentType == 'Assign Trainees') ...[
                  const SizedBox(height: 12),
                  const Text('Select Trainees:'),
                  StreamBuilder<List<TeacherRecord>>(
                    stream: _teacherService.getTeachers(),
                    builder: (context, snapshot) {
                      if (!snapshot.hasData) return const SizedBox();
                      final teachers = snapshot.data!.where((t) => t.role != 'principal').toList();
                      return Wrap(
                        spacing: 8,
                        children: teachers.map((t) => FilterChip(
                          label: Text(t.fullName),
                          selected: _selectedTraineeIds.contains(t.id),
                          onSelected: (selected) {
                            setState(() {
                              if (selected) {
                                _selectedTraineeIds.add(t.id);
                              } else {
                                _selectedTraineeIds.remove(t.id);
                              }
                            });
                          },
                        )).toList(),
                      );
                    },
                  )
                ]
              ],
              const SizedBox(height: 16),
              Align(
                alignment: Alignment.centerRight,
                child: ElevatedButton(onPressed: () {}, child: const Text('Post')),
              )
            ],
          ),
        ),
        const Divider(height: 1),
        const Expanded(
          child: Center(child: Text("Active registrations table will go here.")),
        )
      ],
    );
  }
}