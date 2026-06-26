---
applyTo: "**/*"
---

# Pong Game Build Instructions

Create a simple retro Pong-style web app as a single HTML file with embedded CSS and JavaScript.

## Product Goal

Build a one-minute score attack game where the player controls a paddle and tries to bounce as many balls as possible through a shrinking gap in a wall at the top of the screen.

## Core Requirements

- Use one self-contained HTML file only, with all CSS and JS embedded.
- Use a dark grey background with white graphics and an 1980s arcade feel.
- Show a countdown timer that starts at 60 seconds.
- Show a score counter for how many balls passed through the wall gap.
- Draw a thick wall at the top of the play area with a 200px gap centered in the middle at the start.
- Make the wall gap shrink by 10% of its current width each time the ball passes through it.
- Flash the screen green briefly when the player scores.
- Make the ball bounce off the wall and paddle using reflection-style physics.
- Make the ball start centered on the paddle after each respawn.
- Launch the ball at a random angle up to 45 degrees left or right on spawn.
- The ball should initially take about 1 second to travel from paddle to wall, then steadily speed up until it is twice as fast by the end of the round.
- The paddle should be a short horizontal line about 50px wide.
- Allow paddle control with mouse, trackpad, finger, and arrow keys.
- When the ball hits the paddle, change its outgoing angle based on where it hit: center = straight reflection, edges = stronger angle variation, with a maximum multiplier of 1.5 and a minimum of 0.5.
- If the player misses the ball, leave the ball above the paddle for 2 seconds, then relaunch it at a random angle up to 45 degrees in either direction.
- When the timer reaches zero, stop play, show the final score in the center, and display a play-again button.

## Implementation Notes

- Prefer canvas for the play field and draw the HUD clearly on top.
- Keep the UI minimal, readable, and responsive.
- Make the game reset cleanly when the play-again button is clicked.
- Keep all code in one file unless there is a strong reason not to.
