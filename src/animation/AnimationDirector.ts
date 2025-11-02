import { gsap } from 'gsap';
import { IAnimationChapter } from './IAnimationChapter';
import { AnimationTargets } from './AnimationTargets';
import { IxachiExperience } from '../../main'; // Import IxachiExperience

/**
 * @class AnimationDirector
 * @description Orchestrates a sequence of animation chapters and exposes their parameters.
 */
export class AnimationDirector {
  public masterConfig: { [key: string]: any } = {};
  private targets: AnimationTargets;
  private chapters: { name: string, chapter: IAnimationChapter }[] = [];
  private experience: IxachiExperience; // Store IxachiExperience instance

  private isPlaying: boolean = false;
  private activeChapter: IAnimationChapter | null = null;

  constructor(targets: AnimationTargets, experience: IxachiExperience) {
    this.targets = targets;
    this.experience = experience; // Store the experience instance
    console.log('🎬 [AnimationDirector] Initialized.');
  }

  public addChapter(name: string, chapter: IAnimationChapter): void {
    console.log(`🎞️ [AnimationDirector] Adding chapter: ${name}`);
    if (chapter.params) {
      this.masterConfig[name] = chapter.params;
    }
    this.chapters.push({ name, chapter });
  }

  public async play(): Promise<void> {
    if (this.isPlaying) return;
    this.isPlaying = true;
    console.log('▶️ [AnimationDirector] Main sequence started.');

    for (const { name, chapter } of this.chapters) {
      if (!this.isPlaying) {
        console.log('⏹️ [AnimationDirector] Sequence stopped externally.');
        break;
      }
      console.log(`▶️ [AnimationDirector] Starting chapter: ${name}`);
      this.activeChapter = chapter;
      try {
        await chapter.start(this, this.targets);
        if (chapter.stop) chapter.stop(this.targets); // Cleanup after completion
      } catch (error) {
        console.error(`❌ [AnimationDirector] Chapter ${name} failed:`, error);
        if (chapter.stop) chapter.stop(this.targets); // Ensure cleanup even on error
      }
    }

    console.log('✅ [AnimationDirector] Sequence finished or was stopped.');
    this.activeChapter = null;
    this.isPlaying = false;
  }

  /**
   * Plays a single chapter by its ID.
   * @param chapterId The ID of the chapter to play.
   */
  public async playChapter(chapterId: string): Promise<void> {
    if (this.isPlaying) return;

    const chapterInfo = this.chapters.find(c => c.name === chapterId);
    if (!chapterInfo) {
        console.error(`❌ [AnimationDirector] Chapter with ID '${chapterId}' not found.`);
        return;
    }

    this.isPlaying = true;
    this.activeChapter = chapterInfo.chapter;
    console.log(`▶️ [AnimationDirector] Playing single chapter: ${chapterId}`);

    try {
        await this.activeChapter.start(this, this.targets);
        if (this.activeChapter.stop) this.activeChapter.stop(this.targets);
    } catch (error) {
        console.error(`❌ [AnimationDirector] Chapter ${chapterId} failed:`, error);
        if (this.activeChapter.stop) this.activeChapter.stop(this.targets);
    }

    console.log(`✅ [AnimationDirector] Chapter ${chapterId} finished.`);
    this.activeChapter = null;
    this.isPlaying = false;
  }

  public stop(): void {
    if (!this.isPlaying) return;
    console.log('⏹️ [AnimationDirector] Stopping sequence...');
    this.isPlaying = false;
    if (this.activeChapter?.stop) {
      this.activeChapter.stop(this.targets);
    }
  }
}
