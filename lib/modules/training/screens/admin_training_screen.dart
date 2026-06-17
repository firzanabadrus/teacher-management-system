import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../../app_theme.dart';
import '../../../modules/teachers/models/teacher.dart';
import '../../../modules/teachers/services/teacher_service.dart';
import '../models/training.dart';
import '../providers/training_provider.dart';

class AdminTrainingScreen extends StatefulWidget {
  final TeacherRecord user;
  const AdminTrainingScreen({Key? key, required this.user}) : super(key: key);

  @override
  State<AdminTrainingScreen> createState() => _AdminTrainingScreenState();
}

class _AdminTrainingScreenState extends State<AdminTrainingScreen> {
  final TeacherService _teacherService = TeacherService();
  final TextEditingController _contentController = TextEditingController();
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();
  final TextEditingController _maxSeatsController = TextEditingController();
  final TextEditingController _photoController = TextEditingController();
  final List<String> _selectedTraineeIds = [];
  bool _isCpd = true;
  String _enrollmentMode = 'open_volunteer';
  String _fontStyle = 'sans';

  @override
  void dispose() {
    _contentController.dispose();
    _titleController.dispose();
    _descriptionController.dispose();
    _maxSeatsController.dispose();
    _photoController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<TrainingProvider>();

    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _buildCreatePanel(provider),
              const SizedBox(height: 16),
              _buildApplicationsPanel(provider),
              const SizedBox(height: 16),
              _buildAssignmentPanel(provider),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCreatePanel(TrainingProvider provider) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: _panelDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Create Post / CPD Session',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          TextField(
            controller: _contentController,
            maxLines: 3,
            decoration: const InputDecoration(
                border: OutlineInputBorder(), hintText: 'Content...'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _photoController,
            decoration: const InputDecoration(
                border: OutlineInputBorder(), labelText: 'Photo URL'),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Checkbox(
                  value: _isCpd,
                  onChanged: (value) =>
                      setState(() => _isCpd = value ?? false)),
              const Text('Is this a Training/CPD Session?'),
              const Spacer(),
              SizedBox(
                width: 190,
                child: DropdownButtonFormField<String>(
                  key: ValueKey(_fontStyle),
                  initialValue: _fontStyle,
                  items: const [
                    DropdownMenuItem(value: 'sans', child: Text('Default')),
                    DropdownMenuItem(
                        value: 'console_mono', child: Text('Console Mono')),
                    DropdownMenuItem(
                        value: 'book_serif', child: Text('Book Serif')),
                    DropdownMenuItem(
                        value: 'playful_blue', child: Text('Playful Blue')),
                    DropdownMenuItem(
                        value: 'warm_gold', child: Text('Warm Gold')),
                  ],
                  onChanged: (value) =>
                      setState(() => _fontStyle = value ?? 'sans'),
                  decoration: const InputDecoration(
                      border: OutlineInputBorder(), isDense: true),
                ),
              ),
            ],
          ),
          if (_isCpd) ...[
            const SizedBox(height: 12),
            TextField(
                controller: _titleController,
                decoration: const InputDecoration(
                    labelText: 'Course Title', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(
                controller: _descriptionController,
                maxLines: 2,
                decoration: const InputDecoration(
                    labelText: 'Training Description',
                    border: OutlineInputBorder())),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _maxSeatsController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                        labelText: 'Max Seats', border: OutlineInputBorder()),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    key: ValueKey(_enrollmentMode),
                    initialValue: _enrollmentMode,
                    items: const [
                      DropdownMenuItem(
                          value: 'open_volunteer',
                          child: Text('Open for Volunteers')),
                      DropdownMenuItem(
                          value: 'assigned', child: Text('Assign Trainees')),
                    ],
                    onChanged: (value) => setState(
                        () => _enrollmentMode = value ?? 'open_volunteer'),
                    decoration:
                        const InputDecoration(border: OutlineInputBorder()),
                  ),
                ),
              ],
            ),
            if (_enrollmentMode == 'assigned') ...[
              const SizedBox(height: 12),
              _buildTeacherChips(),
            ],
          ],
          const SizedBox(height: 16),
          Align(
            alignment: Alignment.centerRight,
            child: ElevatedButton.icon(
              onPressed: () => _createPost(provider),
              icon: const Icon(LucideIcons.send, size: 16),
              label: const Text('Post'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTeacherChips(
      {String? postId, List<String> assignedIds = const []}) {
    return StreamBuilder<List<TeacherRecord>>(
      stream: _teacherService.getTeachers(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const LinearProgressIndicator();
        final teachers = snapshot.data!
            .where((teacher) => teacher.role != 'principal')
            .toList();
        if (teachers.isEmpty) return const Text('No teachers available.');

        return Wrap(
          spacing: 8,
          runSpacing: 8,
          children: teachers.map((teacher) {
            final selected = postId == null
                ? _selectedTraineeIds.contains(teacher.id)
                : assignedIds.contains(teacher.id);
            return FilterChip(
              label: Text(teacher.fullName),
              selected: selected,
              onSelected: postId == null
                  ? (value) => setState(() {
                        value
                            ? _selectedTraineeIds.add(teacher.id)
                            : _selectedTraineeIds.remove(teacher.id);
                      })
                  : selected
                      ? null
                      : (_) => context
                          .read<TrainingProvider>()
                          .assignTraineeToTraining(
                              postId: postId, teacherId: teacher.id),
            );
          }).toList(),
        );
      },
    );
  }

  Widget _buildApplicationsPanel(TrainingProvider provider) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: _panelDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Pending Applications',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          StreamBuilder<List<TrainingApplication>>(
            stream: provider.pendingApplications,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const LinearProgressIndicator();
              }
              final applications = snapshot.data ?? [];
              if (applications.isEmpty) {
                return const Text('No pending applications.');
              }

              final grouped = <String, List<TrainingApplication>>{};
              for (final application in applications) {
                grouped
                    .putIfAbsent(application.postId, () => [])
                    .add(application);
              }

              return Column(
                children: grouped.entries.map((entry) {
                  final title = entry.value.first.trainingTitle;
                  final post = provider.posts
                      .where((item) => item.id == entry.key)
                      .firstOrNull;
                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                        border: Border.all(color: AppTheme.subtleGrayBoundary),
                        borderRadius: BorderRadius.circular(8)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                                child: Text(title,
                                    style: const TextStyle(
                                        fontWeight: FontWeight.bold))),
                            if (post != null)
                              Text(
                                  '${post.remainingSeats ?? 'Open'} seats left',
                                  style: const TextStyle(
                                      fontSize: 12, color: Colors.grey)),
                          ],
                        ),
                        const SizedBox(height: 8),
                        ...entry.value.map((application) => ListTile(
                              contentPadding: EdgeInsets.zero,
                              title: Text(application.teacherName),
                              subtitle: Text(DateFormat('MMM dd, yyyy')
                                  .format(application.createdAt)),
                              trailing: Wrap(
                                spacing: 8,
                                children: [
                                  IconButton(
                                    tooltip: 'Approve',
                                    icon: const Icon(LucideIcons.check),
                                    onPressed: () =>
                                        _approve(provider, application),
                                  ),
                                  IconButton(
                                    tooltip: 'Reject',
                                    icon: const Icon(LucideIcons.x),
                                    onPressed: () =>
                                        _reject(provider, application.id),
                                  ),
                                ],
                              ),
                            )),
                      ],
                    ),
                  );
                }).toList(),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildAssignmentPanel(TrainingProvider provider) {
    final posts = provider.adminTrainingPosts();

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: _panelDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Training Assignments',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          if (posts.isEmpty)
            const Text('No training posts yet.')
          else
            ...posts.map((post) => ExpansionTile(
                  tilePadding: EdgeInsets.zero,
                  title: Text(post.trainingTitle ?? 'CPD Session'),
                  subtitle: Text(post.isOpenVolunteer
                      ? 'Open for Volunteers'
                      : 'Assigned'),
                  trailing: Text(post.remainingSeats == null
                      ? '${post.seatsTaken} enrolled'
                      : '${post.remainingSeats} left'),
                  children: [
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _buildTeacherChips(
                            postId: post.id, assignedIds: post.traineeIds),
                      ),
                    ),
                  ],
                )),
        ],
      ),
    );
  }

  Future<void> _createPost(TrainingProvider provider) async {
    final content = _contentController.text.trim();
    if (content.isEmpty) return;
    final maxSeats = int.tryParse(_maxSeatsController.text.trim());

    try {
      await provider.createPost(TrainingPost(
        id: '',
        authorId: widget.user.id,
        authorName: widget.user.fullName,
        authorRole: widget.user.role,
        content: content,
        photoUrl: _photoController.text.trim(),
        likes: const [],
        commentsCount: 0,
        createdAt: DateTime.now(),
        fontStyle: _fontStyle,
        isTraining: _isCpd,
        trainingTitle: _isCpd ? _titleController.text.trim() : null,
        trainingDescription: _isCpd ? _descriptionController.text.trim() : null,
        maxTrainees: _isCpd ? maxSeats : null,
        type: _isCpd ? _enrollmentMode : null,
        enrollmentMode: _isCpd ? _enrollmentMode : 'open_volunteer',
        traineeIds: _isCpd && _enrollmentMode == 'assigned'
            ? List<String>.from(_selectedTraineeIds)
            : const [],
      ));

      _contentController.clear();
      _titleController.clear();
      _descriptionController.clear();
      _maxSeatsController.clear();
      _photoController.clear();
      setState(() {
        _selectedTraineeIds.clear();
        _isCpd = true;
        _enrollmentMode = 'open_volunteer';
        _fontStyle = 'sans';
      });
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(error.toString())));
    }
  }

  Future<void> _approve(
      TrainingProvider provider, TrainingApplication application) async {
    try {
      await provider.approveApplication(application);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(error.toString())));
    }
  }

  Future<void> _reject(TrainingProvider provider, String applicationId) async {
    await provider.rejectApplication(applicationId);
  }

  BoxDecoration _panelDecoration() {
    return BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(8),
      border: Border.all(color: AppTheme.subtleGrayBoundary),
      boxShadow: AppTheme.iosBoxShadow,
    );
  }
}
