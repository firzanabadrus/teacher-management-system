import 'dart:async';

import 'package:flutter/material.dart';

import '../../teachers/models/teacher.dart';
import '../models/training.dart';
import '../services/training_service.dart';

class TrainingProvider extends ChangeNotifier {
  TrainingProvider({TrainingService? trainingService})
      : _trainingService = trainingService ?? TrainingService() {
    _initStreams();
  }

  final TrainingService _trainingService;

  List<TrainingPost> _posts = [];
  bool _isLoading = true;
  String? _errorMessage;
  final Set<String> _busyPostIds = {};
  StreamSubscription<List<TrainingPost>>? _postsSubscription;

  List<TrainingPost> get posts => _posts;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  Stream<List<TrainingApplication>> get pendingApplications =>
      _trainingService.streamApplications(status: 'pending');

  void _initStreams() {
    _postsSubscription = _trainingService.streamPosts().listen(
      (postsList) {
        _posts = postsList;
        _isLoading = false;
        _errorMessage = null;
        notifyListeners();
      },
      onError: (Object error) {
        _isLoading = false;
        _errorMessage = error.toString();
        notifyListeners();
      },
    );
  }

  Stream<List<TrainingComment>> commentsForPost(String postId) =>
      _trainingService.streamComments(postId);

  Stream<List<TrainingApplication>> applicationsForTeacher(String teacherId) =>
      _trainingService.streamApplications(teacherId: teacherId);

  Stream<List<TrainingApplication>> applicationsForPost(String postId) =>
      _trainingService.streamApplications(postId: postId);

  bool isPostBusy(String postId) => _busyPostIds.contains(postId);

  Future<String> createPost(TrainingPost post) async {
    _errorMessage = null;
    notifyListeners();
    try {
      return await _trainingService.createPost(post);
    } catch (error) {
      _errorMessage = error.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<void> toggleLike(TrainingPost post, String userId) async {
    final wasLiked = post.likes.contains(userId);
    final optimisticLikes = [...post.likes];
    wasLiked ? optimisticLikes.remove(userId) : optimisticLikes.add(userId);

    _posts = _posts
        .map((item) => item.id == post.id
            ? TrainingPost(
                id: item.id,
                authorId: item.authorId,
                authorName: item.authorName,
                authorRole: item.authorRole,
                content: item.content,
                photoUrl: item.photoUrl,
                likes: optimisticLikes,
                commentsCount: item.commentsCount,
                createdAt: item.createdAt,
                fontStyle: item.fontStyle,
                isTraining: item.isTraining,
                trainingTitle: item.trainingTitle,
                trainingDescription: item.trainingDescription,
                maxTrainees: item.maxTrainees,
                type: item.type,
                enrollmentMode: item.enrollmentMode,
                traineeIds: item.traineeIds,
              )
            : item)
        .toList();
    notifyListeners();

    try {
      await _trainingService.toggleLike(post.id, userId);
    } catch (error) {
      _errorMessage = error.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<void> addComment({
    required String postId,
    required String authorId,
    required String authorName,
    required String authorRole,
    required String text,
  }) async {
    if (text.trim().isEmpty) return;
    await _trainingService.addComment(
      postId: postId,
      authorId: authorId,
      authorName: authorName,
      authorRole: authorRole,
      text: text,
    );
  }

  Future<void> applyForCourse(
    TrainingPost post,
    String teacherId,
    String teacherName,
  ) async {
    _setPostBusy(post.id, true);
    try {
      final application = TrainingApplication(
        id: '${post.id}_$teacherId',
        postId: post.id,
        trainingTitle: post.trainingTitle ?? 'Training',
        teacherId: teacherId,
        teacherName: teacherName,
        status: 'pending',
        createdAt: DateTime.now(),
      );

      await _trainingService.applyTraining(application);
    } finally {
      _setPostBusy(post.id, false);
    }
  }

  Future<void> approveApplication(TrainingApplication application) =>
      _trainingService.approveApplication(application);

  Future<void> rejectApplication(String applicationId) =>
      _trainingService.rejectApplication(applicationId);

  Future<void> assignTraineeToTraining({
    required String postId,
    required String teacherId,
  }) =>
      _trainingService.assignTraineeToTraining(
          postId: postId, teacherId: teacherId);

  Future<TeacherRecord?> getFacultyProfile(String authorId) =>
      _trainingService.getFacultyProfile(authorId);

  List<TrainingPost> teacherPosts() => _posts;

  List<TrainingPost> adminTrainingPosts() =>
      _posts.where((post) => post.isTraining).toList();

  void _setPostBusy(String postId, bool busy) {
    if (busy) {
      _busyPostIds.add(postId);
    } else {
      _busyPostIds.remove(postId);
    }
    notifyListeners();
  }

  @override
  void dispose() {
    _postsSubscription?.cancel();
    super.dispose();
  }
}
