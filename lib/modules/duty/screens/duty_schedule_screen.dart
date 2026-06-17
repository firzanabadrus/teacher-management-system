import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';

import '../models/duty.dart';
import '../services/duty_service.dart';
import '../../../app_theme.dart';

class DutyScheduleScreen extends StatelessWidget {
  const DutyScheduleScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final DutyService db = DutyService();

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Master Schedule', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          Container(
            height: 100,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: const Color(0xFFF0EFEC)),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Text('Calendar Grid Placeholder'),
          ),
          const SizedBox(height: 24),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 2,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Tasks for Selected Date', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    StreamBuilder<List<DutyAssignment>>(
                      stream: db.getAssignmentsForDate(DateFormat('yyyy-MM-dd').format(DateTime.now())),
                      builder: (context, snapshot) {
                        if (snapshot.connectionState == ConnectionState.waiting) return const CircularProgressIndicator();
                        if (!snapshot.hasData || snapshot.data!.isEmpty) return const Text("No tasks.");

                        return ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: snapshot.data!.length,
                          itemBuilder: (context, index) {
                            final duty = snapshot.data![index];
                            return Card(
                              child: ListTile(
                                title: Text(duty.taskName),
                                subtitle: Text('${duty.locationName} • ${duty.timeStart}-${duty.timeEnd}'),
                                trailing: Text(
                                  duty.status,
                                  style: TextStyle(color: duty.status == 'completed' ? Colors.green : Colors.orange),
                                ),
                              ),
                            );
                          },
                        );
                      },
                    )
                  ],
                ),
              ),
              const SizedBox(width: 24),
              Expanded(
                flex: 1,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Negotiation Swaps', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Sarah wants to swap with David for Main Gate Duty.'),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                TextButton(
                                  onPressed: () {},
                                  child: const Text('Reject', style: TextStyle(color: Colors.red)),
                                ),
                                ElevatedButton(
                                  onPressed: () {},
                                  child: const Text('Accept'),
                                ),
                              ],
                            )
                          ],
                        ),
                      ),
                    )
                  ],
                ),
              )
            ],
          )
        ],
      ),
    );
  }
}