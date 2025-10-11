import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { writeFile } from 'fs/promises';

const execAsync = promisify(exec);

// Function to find available Python command
async function findPythonCommand() {
  const commands = ['python3', 'python', '/usr/bin/python3', '/usr/bin/python'];
  
  for (const cmd of commands) {
    try {
      const { stdout, stderr } = await execAsync(`${cmd} --version`);
      const output = stdout || stderr;
      if (output.toLowerCase().includes('python 3')) {
        console.log(`Found Python: ${cmd} - ${output.trim()}`);
        return cmd;
      }
    } catch (error) {
      console.log(`${cmd} not found, trying next...`);
      continue;
    }
  }
  
  throw new Error('Python 3 not found. Please ensure Python is installed.');
}

export async function runTournament(agentFilePath, rollNumber) {
  return new Promise(async (resolve, reject) => {
    try {
      // Find Python first
      let pythonCmd;
      try {
        pythonCmd = await findPythonCommand();
      } catch (error) {
        reject(new Error('Python 3 is not installed or not in PATH. Error: ' + error.message));
        return;
      }

      const pythonDir = path.join(process.cwd(), 'python');
      const tempRunnerPath = path.join(pythonDir, `temp_runner_${rollNumber}_${Date.now()}.py`);
      
      // Create a temporary runner that imports the student's agent
      const runnerCode = `
import json
import sys
import os

# Add the uploads directory to the Python path
sys.path.insert(0, '${path.dirname(agentFilePath).replace(/\\/g, '\\\\')}')

from game_engine import GraphColoringGame

# Import the student's agent
try:
    agent_module = __import__('${rollNumber}')
    agent_class = getattr(agent_module, 'CSP_AGENT')
except Exception as e:
    print(json.dumps({
        "score": 0,
        "moves": 0,
        "reassignments": 0,
        "is_correct": False,
        "error": f"Failed to import agent: {str(e)}"
    }))
    sys.exit(0)

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
            return False, "Action must be a dictionary"
        node = action.get('node')
        if node not in state['visible_graph']['nodes']:
            return False, f"Cannot move to node '{node}'"
        return True, "OK"

    def _validate_color(self, action, state):
        if not isinstance(action, dict) or action.get('action') != 'color':
            return False, "Action must be a dictionary"
        node = action.get('node')
        color = action.get('color')
        if node != state['current_node']:
            return False, f"Can only color current node"
        if color not in state['available_colors']:
            return False, f"Color '{color}' is not valid"
        return True, "OK"

try:
    level_file = "${path.join(pythonDir, 'level1.json').replace(/\\/g, '\\\\')}"
    runner = GameRunner(level_file, agent_class)
    final_summary = runner.run_game()
    print(json.dumps(final_summary))
except Exception as e:
    print(json.dumps({
        "score": 0,
        "moves": 0,
        "reassignments": 0,
        "is_correct": False,
        "error": f"Tournament execution failed: {str(e)}"
    }))
`;

      await writeFile(tempRunnerPath, runnerCode);

      console.log(`Spawning Python process: ${pythonCmd} ${tempRunnerPath}`);

      const proc = spawn(pythonCmd, [tempRunnerPath], {
        cwd: process.cwd(),
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
      });

      let output = '';
      let errorOutput = '';

      proc.stdout.on('data', (data) => {
        const text = data.toString();
        console.log('Python stdout:', text);
        output += text;
      });

      proc.stderr.on('data', (data) => {
        const text = data.toString();
        console.error('Python stderr:', text);
        errorOutput += text;
      });

      proc.on('close', (code) => {
        console.log(`Python process exited with code ${code}`);
        
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}. Error: ${errorOutput}`));
          return;
        }

        try {
          // Extract JSON from output (last line should be the JSON)
          const lines = output.trim().split('\n');
          const jsonLine = lines[lines.length - 1];
          console.log('Parsing JSON:', jsonLine);
          const result = JSON.parse(jsonLine);
          resolve(result);
        } catch (error) {
          console.error('Failed to parse JSON:', error);
          reject(new Error(`Failed to parse tournament result: ${error.message}. Output: ${output}`));
        }
      });

      proc.on('error', (error) => {
        console.error('Python process error:', error);
        reject(new Error(`Failed to start Python process: ${error.message}. Command: ${pythonCmd}`));
      });

    } catch (error) {
      console.error('Tournament error:', error);
      reject(error);
    }
  });
}