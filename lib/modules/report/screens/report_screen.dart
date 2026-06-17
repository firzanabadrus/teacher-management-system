import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../models/report.dart';
import '../services/report_service.dart';
import '../../../app_theme.dart';

class ReportScreen extends StatelessWidget {
  const ReportScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final ReportService db = ReportService();

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Triaging Dashboard', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
          const SizedBox(height: 24),
          StreamBuilder<List<FacilityReport>>(
            stream: db.getReports(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) return const CircularProgressIndicator();
              if (!snapshot.hasData || snapshot.data!.isEmpty) return const Text("No reports.");

              return ListView.builder(
                shrinkWrap: true,
                itemCount: snapshot.data!.length,
                itemBuilder: (context, index) {
                  final report = snapshot.data![index];
                  return ExpansionTile(
                    title: Text(report.description),
                    subtitle: Text('Status: ${report.status} • Priority: ${report.priority}'),
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Reported by: ${report.teacherName}'),
                            if (report.photoUrl.isNotEmpty) const Text('Photo attached.'),
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                const DropdownMenu<String>(dropdownMenuEntries: [
                                  DropdownMenuEntry(value: 'under_review', label: 'Under Review'),
                                  DropdownMenuEntry(value: 'action_taken', label: 'Action Taken'),
                                  DropdownMenuEntry(value: 'resolved', label: 'Resolved'),
                                ]),
                                const SizedBox(width: 16),
                                ElevatedButton(onPressed: () {}, child: const Text('Update Status')),
                              ],
                            )
                          ],
                        ),
                      )
                    ],
                  );
                },
              );
            },
          )
        ],
      ),
    );
  }
}