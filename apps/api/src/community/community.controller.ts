import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/auth-user.interface.js';
import {
  CreateAnswerCommentDto,
  CreateAnswerDto,
  CreatePostCommentDto,
  CreatePostDto,
  CreateQuestionDto,
  QueryPostsDto,
  QueryQuestionsDto,
  ToggleLikeDto,
  UpdatePostDto,
  UpdateQuestionDto,
} from './dto.js';
import { CommunityService } from './community.service.js';

export interface UploadedImageFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller('community')
@UseGuards(AuthGuard)
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Post('upload-images')
  @UseInterceptors(
    FilesInterceptor('files', 4, {
      limits: {
        fileSize: 5 * 1024 * 1024,
        files: 4,
      },
    }),
  )
  uploadImages(@UploadedFiles() files: UploadedImageFile[]) {
    return this.communityService.uploadImages(files);
  }

  @Get('stats')
  getStats() {
    return this.communityService.getStats();
  }

  @Get('questions')
  listQuestions(@Query() query: QueryQuestionsDto) {
    return this.communityService.listQuestions(query);
  }

  @Get('questions/:id')
  getQuestion(@Param('id') id: string) {
    return this.communityService.getQuestion(id);
  }

  @Post('questions')
  createQuestion(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.communityService.createQuestion(user.id, dto);
  }

  @Delete('questions/:id')
  deleteQuestion(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.communityService.deleteQuestion(id, user.id, user.roles || []);
  }

  @Patch('questions/:id')
  updateQuestion(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.communityService.updateQuestion(
      id,
      user.id,
      user.roles || [],
      dto,
    );
  }

  @Post('questions/:id/answers')
  createAnswer(
    @Param('id') questionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAnswerDto,
  ) {
    return this.communityService.createAnswer(questionId, user.id, dto);
  }

  @Patch('questions/:questionId/answers/:answerId/accept')
  acceptAnswer(
    @Param('questionId') questionId: string,
    @Param('answerId') answerId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.communityService.acceptAnswer(
      questionId,
      answerId,
      user.id,
      user.roles || [],
    );
  }

  @Delete('questions/:questionId/answers/:answerId')
  deleteAnswer(
    @Param('questionId') questionId: string,
    @Param('answerId') answerId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.communityService.deleteAnswer(
      questionId,
      answerId,
      user.id,
      user.roles || [],
    );
  }

  @Post('questions/:questionId/answers/:answerId/comments')
  createAnswerComment(
    @Param('questionId') questionId: string,
    @Param('answerId') answerId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAnswerCommentDto,
  ) {
    return this.communityService.createAnswerComment(
      questionId,
      answerId,
      user.id,
      dto,
    );
  }

  @Delete('questions/:questionId/answers/:answerId/comments/:commentId')
  deleteAnswerComment(
    @Param('questionId') questionId: string,
    @Param('answerId') answerId: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.communityService.deleteAnswerComment(
      questionId,
      answerId,
      commentId,
      user.id,
      user.roles || [],
    );
  }

  // ---------------------------------------------------------------------------
  // Posts, Comments & Likes
  // ---------------------------------------------------------------------------

  @Get('posts')
  listPosts(
    @Query() query: QueryPostsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.communityService.listPosts(query, user.id);
  }

  @Get('posts/:id')
  getPost(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.communityService.getPost(id, user.id);
  }

  @Post('posts')
  createPost(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePostDto,
  ) {
    return this.communityService.createPost(user.id, user.roles || [], dto);
  }

  @Delete('posts/:id')
  deletePost(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.communityService.deletePost(id, user.id, user.roles || []);
  }

  @Patch('posts/:id')
  updatePost(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePostDto,
  ) {
    return this.communityService.updatePost(
      id,
      user.id,
      user.roles || [],
      dto,
    );
  }

  @Post('posts/:id/like')
  toggleLike(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto?: ToggleLikeDto,
  ) {
    return this.communityService.toggleLikePost(id, user.id, dto?.liked);
  }

  @Post('posts/:id/comments')
  createPostComment(
    @Param('id') postId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePostCommentDto,
  ) {
    return this.communityService.createPostComment(postId, user.id, dto);
  }

  @Delete('posts/:id/comments/:commentId')
  deletePostComment(
    @Param('id') postId: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.communityService.deletePostComment(
      postId,
      commentId,
      user.id,
      user.roles || [],
    );
  }
}
