/**
 * Character System Exports
 *
 * Sage personality and relationship progression for the AI coach.
 */

// Sage Personality
export {
  type PersonalityTrait,
  type ConversationTone,
  type SageOpinion,
  type SagePetPeeve,
  type PersonalityState,
  SAGE_IDENTITY,
  SAGE_OPINIONS,
  SAGE_PET_PEEVES,
  CELEBRATION_PHRASES,
  STRUGGLE_PHRASES,
  SAGE_GREETINGS,
  getCelebrationPhrase,
  getStrugglePhrase,
  findRelevantOpinion,
  findRelevantPetPeeve,
  determineTone,
  buildPersonalityContext,
} from './sagePersonality';

// Relationship Progression
export {
  type RelationshipStage,
  type RelationshipMilestone,
  type MilestoneTrigger,
  type RelationshipState,
  type SharedMemory,
  type RelationshipContext,
  RELATIONSHIP_MILESTONES,
  determineRelationshipStage,
  createInitialRelationshipState,
  updateRelationshipState,
  checkForNewMilestones,
  buildRelationshipContext,
  buildRelationshipContextString,
  createSharedMemory,
} from './relationshipProgression';
