import { spawn } from 'child_process';
import path from 'path';
import { writeFile, readFile } from 'fs/promises';

export async function runTournament(agentFilePath, rollNumber) {
  return new Promise(async (resolve, reject) => {
    try {
      const pythonDir = path.join(process.cwd(), 'python');
      const tempRunnerPath = path.join(pythonDir, 'temp_runner.py');
      
      // Create a temporary runner that imports the student's agent
      const runnerCode = `
import json
import sys
import os

# Add the uploads directory to the Python path
sys.path.insert(0, '${path.dirname(agentFilePath)}')

from game_engine import GraphColoringGame

# Import the student's agent
agent_module = __import__('${rollNumber}')
agent_class = getattr(agent_module, 'CSP_AGENT')

class GameRunner:
    def __init__(self, level_file, agent_class):
        self.game = GraphColoringGame(level_file)
        self.agent = agent_class(self.game.get_visible_state())
        self.max_steps = len(self.game.nodes) * 10

    def run_game(self):
        for step in range(self.max_steps):
            visible_state = self.game.get_visible_state()
            try:
                move_action = self.agent.get_next_move(visible_state)
            except Exception as e:
                return self._fail_game(f"Agent crashed in get_next_move: {e}")
            
            is_valid, message = self._validate_move(move_action, visible_state)
            if not is_valid:
                return self._fail_game(f"Invalid move action: {message}")

            self.game.move_to(move_action['node'])
            
            visible_state_after_move = self.game.get_visible_state()
            try:
                color_action = self.agent.get_color_for_node(self.game.current_node, visible_state_after_move)
            except Exception as e:
                return self._fail_game(f"Agent crashed in get_color_for_node: {e}")

            is_valid, message = self._validate_color(color_action, visible_state_after_move)
            if not is_valid:
                return self._fail_game(f"Invalid color action: {message}")

            self.game.assign_color(color_action['node'], color_action['color'])

            if self.game.is_fully_and_correctly_colored():
                break
        
        return self.game.get_final_summary()

    def _fail_game(self, error_message):
        summary = self.game.get_final_summary()
        summary['score'] = 0
        summary['is_correct'] = False
        summary['error'] = error_message
        return summary

    def _validate_move(self, action, state):
        if not isinstance(action, dict) or action.get('action') != 'move':
            return False, "Action must be a dictionary {'action': 'move', 'node': 'NODE_ID'}."
        node = action.get('node')
        if node not in state['visible_graph']['nodes']:
            return False, f"Cannot move to node '{node}' as it is not currently visible."
        return True, "OK"

    def _validate_color(self, action, state):
        if not isinstance(action, dict) or action.get('action') != 'color':
            return False, "Action must be a dictionary {'action': 'color', 'node': 'NODE_ID', 'color': 'COLOR'}."
        node = action.get('node')
        color = action.get('color')
        if node != state['current_node']:
            return False, f"Can only color the current node '{state['current_node']}', not '{node}'."
        if color not in state['available_colors']:
            return False, f"Color '{color}' is not valid for this level."
        return True, "OK"

if __name__ == "__main__":
    level_file = "${path.join(pythonDir, 'level1.json')}"
    runner = GameRunner(level_file, agent_class)
    final_summary = runner.run_game()
    print(json.dumps(final_summary))
`;

      await writeFile(tempRunnerPath, runnerCode);

      const pythonProcess = spawn('python3', [tempRunnerPath]);

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}. Error: ${errorOutput}`));
          return;
        }

        try {
          // Extract JSON from output (last line should be the JSON)
          const lines = output.trim().split('\n');
          const jsonLine = lines[lines.length - 1];
          const result = JSON.parse(jsonLine);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse tournament result: ${error.message}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });

    } catch (error) {
      reject(error);
    }
  });
}