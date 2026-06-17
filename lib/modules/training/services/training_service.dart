import 'package:cloud_firestore/cloud_firestore.dart';

import '../../teachers/models/teacher.dart';
import '../models/training.dart';

class TrainingService {
  TrainingService({FirebaseFirestore? firestore})
      : _db = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _db;

  CollectionReference<Map<String, dynamic>> get _posts =>
      _db.collection('training_posts');
  CollectionReference<Map<String, dynamic>> get _applications =>
      _db.collection('trainingApplications');
  CollectionReference<Map<String, dynamic>> get _teachers =>
      _db.collection('teachers');

  Future<String> createPost(TrainingPost post) async {
    final doc = post.id.isEmpty ? _posts.doc() : _posts.doc(post.id);
    await doc.set(post.toMap());
    return doc.id;
  }

  Stream<List<TrainingPost>> streamPosts({bool trainingOnly = false}) {
    Query<Map<String, dynamic>> query =
        _posts.orderBy('createdAt', descending: true);
    if (trainingOnly) {
      query = query.where('isTraining', isEqualTo: true);
    }

    return query.snapshots().map(
          (snapshot) => snapshot.docs
              .map((doc) => TrainingPost.fromMap(doc.id, doc.data()))
              .toList(),
        );
  }

  Stream<List<TrainingPost>> getTrainingPosts() => streamPosts();

  Future<void> toggleLike(String postId, String userId) async {
    final ref = _posts.doc(postId);
    await _db.runTransaction((transaction) async {
      final snapshot = await transaction.get(ref);
      if (!snapshot.exists) return;

      final likes = List<String>.from(snapshot.data()?['likes'] ?? []);
      transaction.update(ref, {
        'likes': likes.contains(userId)
            ? FieldValue.arrayRemove([userId])
            : FieldValue.arrayUnion([userId]),
      });
    });
  }

  Future<void> addComment({
    required String postId,
    required String authorId,
    required String authorName,
    required String authorRole,
    required String text,
  }) async {
    final postRef = _posts.doc(postId);
    final commentRef = postRef.collection('comments').doc();
    final comment = TrainingComment(
      id: commentRef.id,
      postId: postId,
      authorId: authorId,
      authorName: authorName,
      authorRole: authorRole,
      text: text.trim(),
      createdAt: DateTime.now(),
    );

    await _db.runTransaction((transaction) async {
      transaction.set(commentRef, comment.toMap());
      transaction.update(postRef, {'commentsCount': FieldValue.increment(1)});
    });
  }

  Stream<List<TrainingComment>> streamComments(String postId) {
    return _posts
        .doc(postId)
        .collection('comments')
        .orderBy('createdAt')
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => TrainingComment.fromMap(doc.id, doc.data()))
            .toList());
  }

  Future<void> applyTraining(TrainingApplication application) async {
    final appRef =
        _applications.doc('${application.postId}_${application.teacherId}');
    final postRef = _posts.doc(application.postId);

    await _db.runTransaction((transaction) async {
      final postSnapshot = await transaction.get(postRef);
      if (!postSnapshot.exists) {
        throw StateError('Training post no longer exists.');
      }

      final post = TrainingPost.fromMap(postSnapshot.id, postSnapshot.data()!);
      if (!post.isTraining || !post.isOpenVolunteer) {
        throw StateError(
            'This training is not open for volunteer applications.');
      }
      if (post.isFull) {
        throw StateError('This training is already full.');
      }
      if (post.traineeIds.contains(application.teacherId)) {
        throw StateError('You are already enrolled in this training.');
      }

      final appSnapshot = await transaction.get(appRef);
      if (appSnapshot.exists) {
        final status = appSnapshot.data()?['status'] ?? 'pending';
        if (status == 'pending' || status == 'approved') {
          throw StateError(
              'You already have an application for this training.');
        }
      }

      transaction.set(appRef, application.toMap());
    });
  }

  Future<void> approveApplication(TrainingApplication application) async {
    final appRef = _applications.doc(application.id);
    final postRef = _posts.doc(application.postId);

    await _db.runTransaction((transaction) async {
      final postSnapshot = await transaction.get(postRef);
      if (!postSnapshot.exists) {
        throw StateError('Training post no longer exists.');
      }

      final post = TrainingPost.fromMap(postSnapshot.id, postSnapshot.data()!);
      if (post.isFull && !post.traineeIds.contains(application.teacherId)) {
        throw StateError('No seats remain for this training.');
      }

      transaction.update(appRef, {'status': 'approved'});
      transaction.update(postRef, {
        'traineeIds': FieldValue.arrayUnion([application.teacherId]),
      });
    });
  }

  Future<void> rejectApplication(String applicationId) async {
    await _applications.doc(applicationId).update({'status': 'rejected'});
  }

  Future<void> assignTraineeToTraining({
    required String postId,
    required String teacherId,
  }) async {
    final postRef = _posts.doc(postId);
    await _db.runTransaction((transaction) async {
      final postSnapshot = await transaction.get(postRef);
      if (!postSnapshot.exists) {
        throw StateError('Training post no longer exists.');
      }

      final post = TrainingPost.fromMap(postSnapshot.id, postSnapshot.data()!);
      if (post.isFull && !post.traineeIds.contains(teacherId)) {
        throw StateError('No seats remain for this training.');
      }

      transaction.update(postRef, {
        'traineeIds': FieldValue.arrayUnion([teacherId]),
      });
    });
  }

  Stream<List<TrainingApplication>> streamApplications({
    String? status,
    String? teacherId,
    String? postId,
  }) {
    Query<Map<String, dynamic>> query =
        _applications.orderBy('createdAt', descending: true);
    if (status != null) {
      query = query.where('status', isEqualTo: status);
    }
    if (teacherId != null) {
      query = query.where('teacherId', isEqualTo: teacherId);
    }
    if (postId != null) {
      query = query.where('postId', isEqualTo: postId);
    }

    return query.snapshots().map(
          (snapshot) => snapshot.docs
              .map((doc) => TrainingApplication.fromMap(doc.id, doc.data()))
              .toList(),
        );
  }

  Future<TeacherRecord?> getFacultyProfile(String authorId) async {
    final doc = await _teachers.doc(authorId).get();
    if (!doc.exists || doc.data() == null) return null;
    return TeacherRecord.fromMap(doc.id, doc.data()!);
  }
}
