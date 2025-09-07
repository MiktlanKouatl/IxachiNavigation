<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Ixachi Navigation - Custom Instructions

This is a Three.js project focused on creating animated, growing lines with flocking behavior simulation.

## Project Overview
- **Language**: TypeScript
- **Framework**: Three.js with Vite
- **Core Concept**: Self-generating lines that grow forward and shrink backward while maintaining constant length
- **Behavior**: Flocking/swarming behavior similar to fish schools or bird flocks
- **Visual Style**: Microchip-like aesthetic with glowing lines

## Architecture
- **OOP Design**: Everything is class-based with clear separation of concerns
- **Line3d Class**: Core entity that handles line generation, movement, and individual behavior
- **FlockingSystem Class**: Manages collective behavior and synchronization between lines
- **IxachiNavigationScene**: Main scene controller

## Key Features
1. **Growing Lines**: Lines grow forward and remove points from the back to maintain constant length
2. **Flocking Behavior**: Separation, alignment, and cohesion forces
3. **Wandering**: Subtle random movement to avoid predictable patterns
4. **Microchip Patterns**: Organized lane-like movement

## Coding Standards
- Use TypeScript strict mode
- Follow Three.js best practices for performance
- Implement proper disposal methods for cleanup
- Use Vector3 for all 3D calculations
- Apply OOP principles with clear interfaces

## Performance Considerations
- Efficient BufferGeometry updates
- Proper memory management
- Optimized flocking calculations
- 60fps target performance
