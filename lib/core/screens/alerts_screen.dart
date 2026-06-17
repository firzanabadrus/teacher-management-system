import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';

import '../models/notification.dart';
import '../services/notification_service.dart';
import '../../modules/teachers/models/teacher.dart';
import '../../app_theme.dart';

class AlertsScreen extends StatelessWidget {
  final TeacherRecord user;
  const AlertsScreen({Key? key, required this.user}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final NotificationService notificationService = NotificationService();

    return StreamBuilder<List<AlertNotification>>(
      stream: notificationService.getNotifications(user.id),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
        if (!snapshot.hasData || snapshot.data!.isEmpty) return const Center(child: Text("No alerts."));

        final alerts = snapshot.data!;
        return ListView.builder(
          itemCount: alerts.length,
          itemBuilder: (context, index) {
            final alert = alerts[index];
            return Dismissible(
              key: Key(alert.id),
              direction: DismissDirection.startToEnd,
              background: Container(
                color: Colors.green,
                alignment: Alignment.centerLeft,
                padding: const EdgeInsets.only(left: 20),
                child: const Icon(LucideIcons.check, color: Colors.white),
              ),
              onDismissed: (_) {},
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: alert.isRead ? Colors.grey.withOpacity(0.1) : AppTheme.primaryColor.withOpacity(0.1),
                  child: Icon(LucideIcons.bell, color: alert.isRead ? Colors.grey : AppTheme.primaryColor),
                ),
                title: Text(alert.title, style: TextStyle(fontWeight: alert.isRead ? FontWeight.normal : FontWeight.bold)),
                subtitle: Text(alert.message),
                trailing: Text(DateFormat('HH:mm').format(alert.timestamp), style: const TextStyle(fontSize: 12, color: Colors.grey)),
              ),
            );
          },
        );
      },
    );
  }
}