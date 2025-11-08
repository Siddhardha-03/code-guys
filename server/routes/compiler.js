const express = require('express');
const router = express.Router();
const judge0 = require('../utils/judge0');

/**
 * @route   POST /api/compiler/execute
 * @desc    Execute code without saving (online compiler)
 * @access  Public
 */
router.post('/execute', async (req, res) => {
  try {
    const { code, language, input } = req.body;
    
    if (!code || !language) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide code and language'
      });
    }
    
    const result = await judge0.submitCode(code, language, input || '');
    
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Execute code error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to execute code. Please try again.'
    });
  }
});

/**
 * @route   GET /api/compiler/languages
 * @desc    Get supported languages
 * @access  Public
 */
router.get('/languages', (req, res) => {
  try {
    const languages = [
      { id: 'javascript', name: 'JavaScript (Node.js)', version: '12.14.0' },
      { id: 'python', name: 'Python', version: '3.8.1' },
      { id: 'java', name: 'Java', version: 'OpenJDK 13.0.1' },
      { id: 'cpp', name: 'C++', version: 'GCC 9.2.0' },
      { id: 'c', name: 'C', version: 'GCC 9.2.0' },
      { id: 'csharp', name: 'C#', version: 'Mono 6.6.0.161' },
      { id: 'ruby', name: 'Ruby', version: '2.7.0' },
      { id: 'go', name: 'Go', version: '1.13.5' },
      { id: 'php', name: 'PHP', version: '7.4.1' },
    ];
    
    res.status(200).json({
      status: 'success',
      data: {
        languages
      }
    });
  } catch (error) {
    console.error('Get languages error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch languages. Please try again.'
    });
  }
});

/**
 * @route   GET /api/compiler/templates/:language
 * @desc    Get code template for a language
 * @access  Public
 */
router.get('/templates/:language', (req, res) => {
  try {
    const language = req.params.language;
    let template = '';
    
    // Provide starter templates for each language
    switch (language) {
      case 'javascript':
        template = '// JavaScript (Node.js) code\n\nconsole.log("Hello, World!");';
        break;
      case 'python':
        template = '# Python code\n\nprint("Hello, World!")';
        break;
      case 'java':
        template = 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}';
        break;
      case 'cpp':
        template = '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}';
        break;
      case 'c':
        template = '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\n");\n    return 0;\n}';
        break;
      case 'csharp':
        template = 'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, World!");\n    }\n}';
        break;
      case 'ruby':
        template = '# Ruby code\n\nputs "Hello, World!"';
        break;
      case 'go':
        template = 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}';
        break;
      case 'php':
        template = '<?php\n\necho "Hello, World!\n";\n?>';
        break;
      default:
        template = '// Start coding here';
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        template
      }
    });
  } catch (error) {
    console.error('Get template error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch template. Please try again.'
    });
  }
});

module.exports = router;