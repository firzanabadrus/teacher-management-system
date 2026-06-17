import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../teachers/services/teacher_service.dart';
import '../../../app_theme.dart';

class KpiScreen extends StatelessWidget {
  const KpiScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final TeacherService _teacherService = TeacherService();

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('KPI Management', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
          const SizedBox(height: 24),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Point Allocator', style: TextStyle(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 16),
                        const DropdownMenu<String>(dropdownMenuEntries: [
                          DropdownMenuEntry(value: '1', label: 'Select Teacher...'),
                        ]),
                        const SizedBox(height: 16),
                        const Text('Points: +5'),
                        Slider(value: 5, min: -30, max: 10, onChanged: (v) {}),
                        const SizedBox(height: 16),
                        const TextField(decoration: InputDecoration(labelText: 'Remarks', border: OutlineInputBorder())),
                        const SizedBox(height: 16),
                        ElevatedButton(onPressed: () {}, child: const Text('Allocate Points')),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 24),
              Expanded(
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Warnings Dispatcher', style: TextStyle(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 16),
                        const DropdownMenu<String>(dropdownMenuEntries: [
                          DropdownMenuEntry(value: '1', label: 'Select Teacher...'),
                        ]),
                        const SizedBox(height: 16),
                        const DropdownMenu<String>(dropdownMenuEntries: [
                          DropdownMenuEntry(value: 'verbal', label: 'Verbal Warning'),
                          DropdownMenuEntry(value: 'written', label: 'Written Warning'),
                        ]),
                        const SizedBox(height: 16),
                        const TextField(maxLines: 3, decoration: InputDecoration(labelText: 'Message', border: OutlineInputBorder())),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
                          onPressed: () {},
                          child: const Text('Dispatch Warning'),
                        )
                      ],
                    ),
                  ),
                ),
              )
            ],
          )
        ],
      ),
    );
  }
}