import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/duty.dart';
import '../services/duty_service.dart';

/// =======================
/// TIME HELPERS (CORE ENGINE)
/// =======================
extension TimeX on String {
  int toMinutes() {
    final parts = split(":");
    return int.parse(parts[0]) * 60 + int.parse(parts[1]);
  }
}

/// =======================
/// POSITION MODEL
/// =======================
class PositionedTask {
  final DutyAssignment task;
  final int lane;
  final int laneCount;

  PositionedTask({
    required this.task,
    required this.lane,
    required this.laneCount,
  });
}

/// =======================
/// CALENDAR ENGINE SCREEN
/// =======================
class DutyScheduleScreen extends StatefulWidget {
  const DutyScheduleScreen({super.key});

  @override
  State<DutyScheduleScreen> createState() => _DutyCalendarEngineState();
}

class _DutyCalendarEngineState extends State<DutyScheduleScreen> {
  final DutyService db = DutyService();

  bool showByLocation = true;

  static const double hourHeight = 60;
  static const int startHour = 7;

  /// =======================
  /// TIME → Y POSITION
  /// =======================
  double timeToY(String time) {
    final minutes = time.toMinutes();
    return ((minutes - startHour * 60) / 60) * hourHeight;
  }

  /// =======================
  /// DURATION → HEIGHT
  /// =======================
  double durationHeight(String start, String end) {
    return (end.toMinutes() - start.toMinutes()) * (hourHeight / 60);
  }

  /// =======================
  /// LANE ALLOCATION ENGINE
  /// =======================
  List<PositionedTask> allocateLanes(List<DutyAssignment> tasks) {
    tasks.sort((a, b) =>
        a.timeStart.toMinutes().compareTo(b.timeStart.toMinutes()));

    List<List<DutyAssignment>> lanes = [];

    for (final task in tasks) {
      bool placed = false;

      for (int i = 0; i < lanes.length; i++) {
        final last = lanes[i].last;

        if (task.timeStart.toMinutes() >= last.timeEnd.toMinutes()) {
          lanes[i].add(task);
          placed = true;
          break;
        }
      }

      if (!placed) {
        lanes.add([task]);
      }
    }

    final result = <PositionedTask>[];

    for (int i = 0; i < lanes.length; i++) {
      for (final task in lanes[i]) {
        result.add(PositionedTask(
          task: task,
          lane: i,
          laneCount: lanes.length,
        ));
      }
    }

    return result;
  }

  /// =======================
  /// UI BUILD
  /// =======================
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // TODO: create task (principal only)
        },
        child: const Icon(Icons.add),
      ),
      body: StreamBuilder<List<DutyAssignment>>(
        stream: db.getAssignmentsForDate(
          DateFormat('yyyy-MM-dd').format(DateTime.now()),
        ),
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }

          final tasks = snapshot.data!;
          final positioned = allocateLanes(tasks);

          return SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: SingleChildScrollView(
              scrollDirection: Axis.vertical,
              child: SizedBox(
                width: 1200,
                height: 12 * hourHeight,
                child: Stack(
                  children: [
                    _buildTimeGrid(),

                    ...positioned.map((p) {
                      final top = timeToY(p.task.timeStart);
                      final height = durationHeight(
                          p.task.timeStart, p.task.timeEnd);

                      const laneWidth = 180.0;
                      final left = 80 + (p.lane * laneWidth);

                      return Positioned(
                        top: top,
                        left: left,
                        child: _buildTaskBlock(p, height, laneWidth),
                      );
                    }),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  /// =======================
  /// TASK BLOCK UI
  /// =======================
  Widget _buildTaskBlock(
      PositionedTask p, double height, double laneWidth) {
    return Container(
      width: laneWidth - 10,
      height: height,
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: Colors.blue.shade400,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            p.task.taskName,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 11,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            p.task.locationName,
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 10,
            ),
          ),
          Text(
            "${p.task.timeStart} - ${p.task.timeEnd}",
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 10,
            ),
          ),
        ],
      ),
    );
  }

  /// =======================
  /// BACKGROUND GRID
  /// =======================
  Widget _buildTimeGrid() {
    return SizedBox(
      width: 1200,
      height: 12 * hourHeight,
      child: Column(
        children: List.generate(12, (i) {
          final hour = startHour + i;

          return Container(
            height: hourHeight,
            decoration: BoxDecoration(
              border: Border(
                top: BorderSide(color: Colors.grey.shade300),
              ),
            ),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Padding(
                padding: const EdgeInsets.only(left: 8),
                child: Text(
                  "${hour.toInt()}:00",
                  style: const TextStyle(fontSize: 12),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }
}