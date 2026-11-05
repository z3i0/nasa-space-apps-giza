export interface LocalizedNotificationContent {
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
}

/**
 * Centralized, bilingual notification templates.
 * Isolates and organizes all notification strings in a clean, type-safe catalog,
 * preventing hardcoded raw strings from cluttering database transactions and services.
 */
export const notificationTemplates = {
  mentorship: {
    requestAccepted(mentorName: string): LocalizedNotificationContent {
      return {
        title: 'Mentorship Request Accepted',
        titleAr: 'تم قبول طلب الإرشاد',
        message: `${mentorName} accepted your team's mentorship request.`,
        messageAr: `وافق المرشد ${mentorName} على طلب الإرشاد الخاص بفريقكم.`,
      };
    },
    requestDeclined(mentorName: string): LocalizedNotificationContent {
      return {
        title: 'Mentorship Request Declined',
        titleAr: 'اعتذار عن طلب الإرشاد',
        message: `${mentorName} declined your mentorship request.`,
        messageAr: `اعتذر المرشد ${mentorName} عن تلبية طلب الإرشاد.`,
      };
    },
    newMessageFromMentor(
      senderName: string,
      preview: string,
    ): LocalizedNotificationContent {
      return {
        title: `New message from mentor ${senderName}`,
        titleAr: `رسالة جديدة من المرشد ${senderName}`,
        message: preview,
        messageAr: preview,
      };
    },
    newMessageFromParticipant(
      senderName: string,
      preview: string,
    ): LocalizedNotificationContent {
      return {
        title: `New message from ${senderName}`,
        titleAr: `رسالة جديدة من ${senderName}`,
        message: preview,
        messageAr: preview,
      };
    },
  },
  teams: {
    inviteDeclined(teamName: string): LocalizedNotificationContent {
      return {
        title: 'Team Invitation Declined',
        titleAr: 'تم رفض دعوة الفريق',
        message: `The user declined your invitation to join ${teamName}.`,
        messageAr: `تم رفض دعوتك للانضمام إلى فريق ${teamName}.`,
      };
    },
    inviteAccepted(teamName: string): LocalizedNotificationContent {
      return {
        title: 'Team Invitation Accepted',
        titleAr: 'تم قبول دعوة الفريق',
        message: `A new member has accepted your invitation and joined team ${teamName}!`,
        messageAr: `قبل العضو دعوتك وانضم رسمياً إلى فريق ${teamName}!`,
      };
    },
    joinRequestDeclined(teamName: string): LocalizedNotificationContent {
      return {
        title: 'Team Join Request Declined',
        titleAr: 'تم رفض طلب الانضمام للفريق',
        message: `Your request to join team ${teamName} was not accepted.`,
        messageAr: `تم رفض طلب انضمامك إلى فريق ${teamName}.`,
      };
    },
    joinRequestAccepted(teamName: string): LocalizedNotificationContent {
      return {
        title: 'Team Join Request Accepted',
        titleAr: 'تم قبول طلب الانضمام للفريق',
        message: `Congratulations! You have been accepted into team ${teamName}.`,
        messageAr: `تهانينا! تم قبولك كعضو في فريق ${teamName}.`,
      };
    },
  },
  community: {
    newAnswer(
      responderName: string,
      questionTitlePreview: string,
    ): LocalizedNotificationContent {
      return {
        title: 'New answer to your question',
        titleAr: 'إجابة جديدة على سؤالك',
        message: `${responderName} posted an answer to: "${questionTitlePreview}"`,
        messageAr: `أضاف ${responderName} إجابة على سؤالك: "${questionTitlePreview}"`,
      };
    },
    acceptedSolution(
      questionTitlePreview: string,
    ): LocalizedNotificationContent {
      return {
        title: 'Your answer was marked as solution!',
        titleAr: 'تم اعتماد إجابتك كحل معتمد!',
        message: `Your answer on "${questionTitlePreview}" was selected as the accepted solution.`,
        messageAr: `تم اعتماد إجابتك كحل رسمي ومعتمد لسؤال: "${questionTitlePreview}".`,
      };
    },
    replyToAnswer(
      commenterName: string,
      questionTitlePreview: string,
    ): LocalizedNotificationContent {
      return {
        title: 'New reply to your answer',
        titleAr: 'رد جديد على إجابتك',
        message: `${commenterName} replied to your answer on: "${questionTitlePreview}"`,
        messageAr: `أضاف ${commenterName} رداً على إجابتك في: "${questionTitlePreview}"`,
      };
    },
    replyToComment(
      commenterName: string,
      postTitlePreview: string,
    ): LocalizedNotificationContent {
      return {
        title: 'New reply to your comment',
        titleAr: 'رد جديد على تعليقك',
        message: `${commenterName} replied to your comment on: "${postTitlePreview}"`,
        messageAr: `أضاف ${commenterName} رداً على تعليقك في: "${postTitlePreview}"`,
      };
    },
    newComment(
      commenterName: string,
      postTitlePreview: string,
    ): LocalizedNotificationContent {
      return {
        title: 'New comment on your post',
        titleAr: 'تعليق جديد على منشورك',
        message: `${commenterName} commented on: "${postTitlePreview}"`,
        messageAr: `أضاف ${commenterName} تعليقاً على منشورك: "${postTitlePreview}"`,
      };
    },
  },
} as const;
