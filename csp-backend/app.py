from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import os
import json
import tempfile
import shutil

app = Flask(__name__)
CORS(app)

# Store submissions in memory (or use a database)
submissions = []

@app.route('/')
def home():
    return jsonify({"status": "CSP Tournament Backend API"})

@app.route('/api/submissions', methods=['GET'])
def get_submissions():
    return jsonify({"submissions": submissions})

@app.route('/api/run-tournament', methods=['POST'])
def run_tournament():
    try:
        file = request.files['file']
        roll_number = request.form['rollNumber']
        
        # Create temporary directory
        temp_dir = tempfile.mkdtemp()
        
        # Save uploaded file
        file_path = os.path.join(temp_dir, f'{roll_number}.py')
        file.save(file_path)
        
        # Copy game files to temp directory
        shutil.copy('game_engine.py', temp_dir)
        shutil.copy('level1.json', temp_dir)
        
        # Create runner script
        runner_path = os.path.join(temp_dir, 'runner.py')
        with open(runner_path, 'w') as f:
            f.write(f"""
import json
import sys
from game_engine import GraphColoringGame

# Import student agent
agent_module = __import__('{roll_number}')
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
                return self._fail_game(f"Agent crashed: {{e}}")
            
            is_valid, message = self._validate_move(move_action, visible_state)
            if not is_valid:
                return self._fail_game(f"Invalid move: {{message}}")
            
            self.game.move_to(move_action['node'])
            visible_state_after = self.game.get_visible_state()
            
            try:
                color_action = self.agent.get_color_for_node(
                    self.game.current_node, visible_state_after
                )
            except Exception as e:
                return self._fail_game(f"Agent crashed: {{e}}")
            
            is_valid, message = self._validate_color(color_action, visible_state_after)
            if not is_valid:
                return self._fail_game(f"Invalid color: {{message}}")
            
            self.game.assign_color(color_action['node'], color_action['color'])
            
            if self.game.is_fully_and_correctly_colored():
                break
        
        return self.game.get_final_summary()

    def _fail_game(self, error_message):
        summary = self.game.get_final_summary()
        summary['score'] = 0
        summary['is_correct'] = False
        return summary

    def _validate_move(self, action, state):
        if not isinstance(action, dict) or action.get('action') != 'move':
            return False, "Invalid format"
        node = action.get('node')
        if node not in state['visible_graph']['nodes']:
            return False, "Node not visible"
        return True, "OK"

    def _validate_color(self, action, state):
        if not isinstance(action, dict) or action.get('action') != 'color':
            return False, "Invalid format"
        if action.get('node') != state['current_node']:
            return False, "Wrong node"
        if action.get('color') not in state['available_colors']:
            return False, "Invalid color"
        return True, "OK"

runner = GameRunner('level1.json', agent_class)
result = runner.run_game()
print(json.dumps(result))
""")
        
        # Run tournament
        result = subprocess.run(
            ['python3', runner_path],
            cwd=temp_dir,
            capture_output=True,
            text=True,
            timeout=30
        )
        
        # Clean up
        shutil.rmtree(temp_dir)
        
        if result.returncode != 0:
            return jsonify({
                'error': f'Tournament failed: {result.stderr}'
            }), 500
        
        # Parse result
        output = json.loads(result.stdout.strip().split('\n')[-1])
        
        # Store submission
        submission = {
            'id': len(submissions) + 1,
            'rollNumber': roll_number,
            'score': output['score'],
            'moves': output['moves'],
            'reassignments': output['reassignments'],
            'isCorrect': output['is_correct'],
            'timestamp': None
        }
        submissions.append(submission)
        submissions.sort(key=lambda x: x['score'], reverse=True)
        
        return jsonify({'success': True, 'result': output})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/delete-submission', methods=['DELETE'])
def delete_submission():
    try:
        data = request.json
        submission_id = data.get('id')
        
        global submissions
        submissions = [s for s in submissions if s['id'] != submission_id]
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)