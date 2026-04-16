from flask import Flask, request, jsonify, send_from_directory
import json
import re
from datetime import datetime
import os

app = Flask(__name__, static_folder='.')

# Load data
def load_json(file):
    with open(file, 'r', encoding='utf-8') as f:
        return json.load(f)

questions = load_json('questions.json')
templates = load_json('templates.json')

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/questions.json')
def get_questions():
    return jsonify(questions)

@app.route('/generate_license', methods=['POST'])
def generate_license():
    answers = request.json
    
    # Default values
    if not answers.get('year'):
        answers['year'] = datetime.now().strftime('%Y')
    
    # Compute vector [commercial, risk, openness, ...] 0-1 scale
    vector = {
        'commercial': 1 if answers.get('commercial') == 'Yes, commercial' else 0,
        'risk': {'Low': 0.2, 'Medium': 0.5, 'High': 1.0}[answers.get('risk_level', 'Low')],
        'openness': 0 if answers.get('open_source') == 'No, restrictive/proprietary' else 1,
    }
    
    # Score templates
    scores = []
    for t in templates:
        score = 0
        reasons = []
        
        # Keyword match
        answer_text = ' '.join([answers.get(k, '') for k in answers if k not in ['year', 'owner_name', 'project_name', 'jurisdiction']])
        for kw in t['keywords']:
            if kw.lower() in answer_text.lower():
                score += 2
                reasons.append(f'Matches keyword: {kw}')
        
        # Vector match
        if vector['commercial'] > 0.5 and t['type'] == 'restrictive':
            score += 3
        if vector['risk'] > 0.5 and t['risk'] == 'high':
            score += 2
        if vector['openness'] > 0.7 and t['type'] == 'permissive':
            score += 3
        
        scores.append({'template': t, 'score': score, 'reasons': reasons})
    
    # Select best
    best = max(scores, key=lambda x: x['score'])
    selected_template = best['template']
    
    # Interpolate
    content = selected_template['content']
    for key, value in answers.items():
        content = re.sub(rf'\\{{{key}\\}', value or '', content)
    
    confidence = min(best['score'] / 10 * 100, 100)
    
    return jsonify({
        'content': content,
        'selected': selected_template['name'],
        'confidence': f'{confidence:.0f}%',
        'reasons': best['reasons']
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)

