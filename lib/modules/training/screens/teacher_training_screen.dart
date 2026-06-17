import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';

import '../models/training.dart';
import '../services/training_service.dart';
import '../../teachers/models/teacher.dart';
import '../../../app_theme.dart';

class TeacherTrainingScreen extends StatefulWidget {
  final TeacherRecord user;
  const TeacherTrainingScreen({Key? key, required this.user}) : super(key: key);

  @override
  State<TeacherTrainingScreen> createState() => _TeacherTrainingScreenState();
}

class _TeacherTrainingScreenState extends State<TeacherTrainingScreen> {
  final TrainingService _trainingService = TrainingService();
  bool _isCreatorExpanded = false;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: TextField(
            decoration: InputDecoration(
              hintText: 'Search posts, training, authors...',
              prefixIcon: const Icon(LucideIcons.search),
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              contentPadding: const EdgeInsets.symmetric(vertical: 0),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0),
          child: InkWell(
            onTap: () => setState(() => _isCreatorExpanded = !_isCreatorExpanded),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFF0EFEC)),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      CircleAvatar(radius: 16, child: Text(widget.user.fullName[0])),
                      const SizedBox(width: 12),
                      const Text('Share something...', style: TextStyle(color: Colors.grey)),
                      const Spacer(),
                      Icon(_isCreatorExpanded ? LucideIcons.chevronUp : LucideIcons.plusCircle, color: AppTheme.primaryColor),
                    ],
                  ),
                  if (_isCreatorExpanded) ...[
                    const SizedBox(height: 16),
                    const TextField(maxLines: 3, decoration: InputDecoration(border: OutlineInputBorder(), hintText: 'Write here...')),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        IconButton(icon: const Icon(LucideIcons.list), onPressed: () {}),
                        IconButton(icon: const Icon(LucideIcons.link), onPressed: () {}),
                        IconButton(icon: const Icon(LucideIcons.image), onPressed: () {}),
                        const Spacer(),
                        ElevatedButton(onPressed: () {}, child: const Text('Post')),
                      ],
                    )
                  ]
                ],
              ),
            ),
          ),
        ),
        Expanded(
          child: StreamBuilder<List<TrainingPost>>(
            stream: _trainingService.getTrainingPosts(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
              if (!snapshot.hasData || snapshot.data!.isEmpty) return const Center(child: Text("No posts yet."));

              final posts = snapshot.data!;
              return ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: posts.length,
                itemBuilder: (context, index) => _buildPostCard(posts[index]),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildPostCard(TrainingPost post) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: Color(0xFFF0EFEC))),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(child: Text(post.authorName[0])),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(post.authorName, style: const TextStyle(fontWeight: FontWeight.bold)),
                    Text(post.authorRole, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                  ],
                ),
                const Spacer(),
                Text(DateFormat('MMM dd').format(post.createdAt), style: const TextStyle(fontSize: 12, color: Colors.grey)),
              ],
            ),
            const SizedBox(height: 12),
            if (post.isTraining)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(color: AppTheme.primaryColor.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(LucideIcons.graduationCap, size: 20, color: AppTheme.primaryColor),
                        const SizedBox(width: 8),
                        Expanded(child: Text(post.trainingTitle ?? 'CPD Session', style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryColor))),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text('Seats: ${post.traineeIds.length} / ${post.maxTrainees ?? "\u221E"}', style: const TextStyle(fontSize: 12)),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryColor, foregroundColor: Colors.white),
                        onPressed: post.traineeIds.length >= (post.maxTrainees ?? 999) ? null : () {},
                        child: Text(post.traineeIds.length >= (post.maxTrainees ?? 999) ? '🚫 Fully Booked' : 'Apply to Become Trainee'),
                      ),
                    ),
                  ],
                ),
              ),
            Text(post.content),
            const SizedBox(height: 16),
            const Divider(),
            Row(
              children: [
                IconButton(icon: Icon(post.likes.contains(widget.user.id) ? Icons.thumb_up : Icons.thumb_up_outlined), onPressed: () {}),
                Text('${post.likes.length}'),
                const SizedBox(width: 16),
                IconButton(icon: const Icon(LucideIcons.messageSquare), onPressed: () {}),
                Text('${post.commentsCount}'),
              ],
            )
          ],
        ),
      ),
    );
  }
}