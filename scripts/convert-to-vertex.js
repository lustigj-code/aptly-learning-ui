/**
 * Converts training data from OpenAI format to Vertex AI format
 *
 * OpenAI format:
 * {"messages": [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}, ...]}
 *
 * Vertex AI format:
 * {"systemInstruction": {"role": "system", "parts": [{"text": "..."}]}, "contents": [...]}
 */

const fs = require('fs');
const path = require('path');

function convertToVertexFormat(inputPath, outputPath) {
  console.log(`Reading from: ${inputPath}`);

  const lines = fs.readFileSync(inputPath, 'utf-8').split('\n').filter(Boolean);
  console.log(`Found ${lines.length} training examples`);

  const converted = lines.map((line, index) => {
    try {
      const data = JSON.parse(line);
      const messages = data.messages;

      if (!messages || !Array.isArray(messages)) {
        console.warn(`Line ${index + 1}: No messages array found, skipping`);
        return null;
      }

      // Extract system message
      const systemMsg = messages.find(m => m.role === 'system');

      // Convert conversation (skip system message) and merge consecutive same-role messages
      const nonSystemMessages = messages.filter(m => m.role !== 'system');
      const mergedContents = [];

      for (const m of nonSystemMessages) {
        const vertexRole = m.role === 'assistant' ? 'model' : 'user';
        const lastContent = mergedContents[mergedContents.length - 1];

        // If same role as previous, merge the text
        if (lastContent && lastContent.role === vertexRole) {
          lastContent.parts[0].text += '\n\n' + m.content;
        } else {
          mergedContents.push({
            role: vertexRole,
            parts: [{ text: m.content }]
          });
        }
      }

      const contents = mergedContents;

      // Validate: must have at least 1 user turn followed by 1 model turn
      const hasUser = contents.some(c => c.role === 'user');
      const hasModel = contents.some(c => c.role === 'model');

      if (!hasUser || !hasModel) {
        console.warn(`Line ${index + 1}: Missing user or model turn, skipping (has user: ${hasUser}, has model: ${hasModel})`);
        return null;
      }

      // Validate: must start with user and alternate properly
      if (contents[0].role !== 'user') {
        console.warn(`Line ${index + 1}: First turn is not user, skipping`);
        return null;
      }

      // Build Vertex AI format
      const vertexFormat = {
        contents
      };

      // Add system instruction if present
      if (systemMsg) {
        vertexFormat.systemInstruction = {
          role: 'system',
          parts: [{ text: systemMsg.content }]
        };
      }

      return JSON.stringify(vertexFormat);
    } catch (error) {
      console.error(`Line ${index + 1}: Parse error - ${error.message}`);
      return null;
    }
  }).filter(Boolean);

  console.log(`Successfully converted ${converted.length} examples`);

  fs.writeFileSync(outputPath, converted.join('\n'));
  console.log(`Written to: ${outputPath}`);

  // Show a sample
  if (converted.length > 0) {
    console.log('\nSample converted entry:');
    console.log(JSON.stringify(JSON.parse(converted[0]), null, 2).substring(0, 500) + '...');
  }
}

// Run conversion
const inputPath = path.join(__dirname, '..', 'training-data', 'train_fixed.jsonl');
const outputPath = path.join(__dirname, '..', 'training-data', 'vertex_train.jsonl');

convertToVertexFormat(inputPath, outputPath);
