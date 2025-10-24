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

  constructor(targets: AnimationTargets, experience: IxachiExperience) {
    this.targets = targets;
    this.experience = experience; // Store the experience instance
    console.log('🎬 [AnimationDirector] Initialized.');
  }

  /**
   * Adds a chapter to the sequence and exposes its parameters to the master config.
   * @param name A unique name for the chapter (used as a key in the config).
   * @param chapter An object that implements the IAnimationChapter interface.
   */
  public addChapter(name: string, chapter: IAnimationChapter): void {
    console.log(`🎞️ [AnimationDirector] Adding chapter: ${name}`);
    
    // Expose the chapter's parameters to the master config
    if (chapter.params) {
      this.masterConfig[name] = chapter.params;
    }

    this.chapters.push({ name, chapter });
  }

  /**
   * Plays the sequence of chapters, awaiting each one's completion.
   */
  public async play(): Promise<void> {
    console.log('▶️ [AnimationDirector] Main sequence started.');
    for (let i = 0; i < this.chapters.length; i++) {
      const { name, chapter } = this.chapters[i];
      console.log(`▶️ [AnimationDirector] Starting chapter: ${name}`);
      try {
        await chapter.start(this, this.targets);
        chapter.stop(); // Cleanup after completion

        // Set hostState to 'orbiting' after IntroChapter completes
        if (name === 'Intro') {
          this.experience.setHostState('orbiting');
        }

      } catch (error) {
        console.error(`❌ [AnimationDirector] Chapter ${name} failed:`, error);
        // Optionally, handle error (e.g., skip chapter, stop sequence)
        chapter.stop(); // Ensure cleanup even on error
      }
    }
    console.log('✅ [AnimationDirector] All chapters completed.');
  }
}
