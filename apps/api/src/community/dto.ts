import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  content: string;

  @IsOptional()
  @IsIn(['technical', 'platform', 'challenge', 'general'])
  category?: 'technical' | 'platform' | 'challenge' | 'general';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(4)
  images?: string[];
}

export class UpdateQuestionDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  content?: string;

  @IsOptional()
  @IsIn(['technical', 'platform', 'challenge', 'general'])
  category?: 'technical' | 'platform' | 'challenge' | 'general';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(4)
  images?: string[];
}

export class CreateAnswerDto {
  @IsString()
  @MinLength(3)
  @MaxLength(5000)
  content: string;
}

export class QueryQuestionsDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsIn(['newest', 'most_answers', 'most_views', 'oldest'])
  sort?: 'newest' | 'most_answers' | 'most_views' | 'oldest';
}

export class CreatePostDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(5)
  @MaxLength(10000)
  content: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(4)
  images?: string[];

  @IsOptional()
  isPinned?: boolean;
}

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(10000)
  content?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(4)
  images?: string[];

  @IsOptional()
  isPinned?: boolean;
}

export class CreatePostCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(3000)
  content: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class CreateAnswerCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(3000)
  content: string;
}

export class ToggleLikeDto {
  @IsOptional()
  liked?: boolean;
}

export class QueryPostsDto {
  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsIn(['newest', 'most_likes', 'most_comments', 'oldest'])
  sort?: 'newest' | 'most_likes' | 'most_comments' | 'oldest';
}
