from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from pydub import AudioSegment
from pydub.effects import normalize
import noisereduce as nr
import numpy as np
import io

app = Flask(__name__)
CORS(app)

ALLOWED_EXTENSIONS = {'wav', 'm4a', 'mp3'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def split_normalize_merge(audio, chunk_length=5000):
    chunks = [audio[i:i + chunk_length] for i in range(0, len(audio), chunk_length)]
    normalized_chunks = [normalize(chunk) for chunk in chunks]
    return sum(normalized_chunks)


def reduce_noise(audio):
    samples = np.array(audio.get_array_of_samples())
    reduced_noise = nr.reduce_noise(y=samples, sr=audio.frame_rate, stationary=True)
    return AudioSegment(
        reduced_noise.tobytes(),
        frame_rate=audio.frame_rate,
        sample_width=audio.sample_width,
        channels=1
    )


@app.route('/process', methods=['POST'])
def process_audio():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        audio = AudioSegment.from_file(io.BytesIO(file.read()), format=file.filename.rsplit('.', 1)[1].lower())

        process_type = request.form.get('processType', 'normalize')

        if process_type == 'normalize':
            processed_audio = split_normalize_merge(audio)
        elif process_type == 'noise_reduction':
            processed_audio = reduce_noise(audio)
        else:
            return jsonify({'error': 'Invalid process type'}), 400

        output_filename = f"processed_{file.filename.rsplit('.', 1)[0]}.wav"

        buffer = io.BytesIO()
        processed_audio.export(buffer, format="wav")
        buffer.seek(0)

        return send_file(
            buffer,
            as_attachment=True,
            download_name=output_filename,
            mimetype='audio/wav'
        )
    return jsonify({'error': 'Invalid file type'}), 400


if __name__ == '__main__':
    app.run(debug=True)