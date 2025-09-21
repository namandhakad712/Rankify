#!/usr/bin/env node

/**
 * Comprehensive Test Runner
 * Orchestrates the execution of all test suites with reporting and analysis
 */

import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import { testCategories, executionStrategies, qualityGates, reportingConfig } from './testSuite.config'

interface TestResult {
  category: string
  passed: number
  failed: number
  skipped: number
  duration: number
  coverage?: number
  errors: string[]
}

interface TestSummary {
  totalTests: number
  totalPassed: number
  totalFailed: number
  totalSkipped: number
  totalDuration: number
  overallCoverage: number
  categories: TestResult[]
  qualityGatesPassed: boolean
  recommendations: string[]
}

class TestRunner {
  private results: TestResult[] = []
  private startTime: number = 0

  constructor(private strategy: keyof typeof executionStrategies = 'development') {}

  async run(): Promise<TestSummary> {
    console.log(`🚀 Starting test execution with strategy: ${this.strategy}`)
    this.startTime = Date.now()

    const config = executionStrategies[this.strategy]
    
    try {
      // Ensure test directories exist
      await this.ensureTestDirectories()

      // Run tests for each category
      for (const category of config.categories) {
        console.log(`\n📋 Running ${testCategories[category].name}...`)
        const result = await this.runTestCategory(category, config)
        this.results.push(result)
      }

      // Generate summary
      const summary = this.generateSummary()
      
      // Generate reports
      await this.generateReports(summary)
      
      // Check quality gates
      const qualityCheck = this.checkQualityGates(summary)
      summary.qualityGatesPassed = qualityCheck.passed
      summary.recommendations = qualityCheck.recommendations

      // Print summary
      this.printSummary(summary)

      return summary

    } catch (error) {
      console.error('❌ Test execution failed:', error)
      throw error
    }
  }

  private async ensureTestDirectories(): Promise<void> {
    const directories = [
      './test-results',
      './test-results/screenshots',
      './test-results/videos',
      './test-results/logs',
      './coverage'
    ]

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true })
      } catch (error) {
        // Directory might already exist
      }
    }
  }

  private async runTestCategory(category: string, config: any): Promise<TestResult> {
    const categoryConfig = testCategories[category]
    const startTime = Date.now()

    return new Promise((resolve, reject) => {
      const args = [
        'run',
        '--reporter=json',
        `--testTimeout=${categoryConfig.timeout}`,
        categoryConfig.pattern
      ]

      if (config.coverage && categoryConfig.coverage) {
        args.push('--coverage')
      }

      if (config.parallel && categoryConfig.parallel) {
        args.push('--pool=threads')
      }

      const vitestProcess = spawn('npx', ['vitest', ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      })

      let stdout = ''
      let stderr = ''

      vitestProcess.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      vitestProcess.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      vitestProcess.on('close', (code) => {
        const duration = Date.now() - startTime
        
        try {
          // Parse test results
          const result = this.parseTestOutput(stdout, stderr, category, duration)
          resolve(result)
        } catch (error) {
          reject(new Error(`Failed to parse test results for ${category}: ${error}`))
        }
      })

      vitestProcess.on('error', (error) => {
        reject(new Error(`Failed to run tests for ${category}: ${error}`))
      })
    })
  }

  private parseTestOutput(stdout: string, stderr: string, category: string, duration: number): TestResult {
    const result: TestResult = {
      category,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration,
      errors: []
    }

    try {
      // Try to parse JSON output
      const lines = stdout.split('\n').filter(line => line.trim())
      const jsonLine = lines.find(line => line.startsWith('{') && line.includes('"testResults"'))
      
      if (jsonLine) {
        const testResults = JSON.parse(jsonLine)
        
        if (testResults.testResults) {
          testResults.testResults.forEach((test: any) => {
            if (test.status === 'passed') result.passed++
            else if (test.status === 'failed') result.failed++
            else if (test.status === 'skipped') result.skipped++
          })
        }

        // Extract coverage if available
        if (testResults.coverageMap) {
          result.coverage = this.calculateCoverage(testResults.coverageMap)
        }
      } else {
        // Fallback: parse text output
        const passedMatch = stdout.match(/(\d+) passed/)
        const failedMatch = stdout.match(/(\d+) failed/)
        const skippedMatch = stdout.match(/(\d+) skipped/)

        result.passed = passedMatch ? parseInt(passedMatch[1]) : 0
        result.failed = failedMatch ? parseInt(failedMatch[1]) : 0
        result.skipped = skippedMatch ? parseInt(skippedMatch[1]) : 0
      }

      // Extract errors from stderr
      if (stderr) {
        result.errors = stderr.split('\n').filter(line => 
          line.includes('Error:') || line.includes('Failed:')
        )
      }

    } catch (error) {
      console.warn(`Warning: Could not parse test output for ${category}:`, error)
      // Set default values
      result.passed = 0
      result.failed = 1
      result.errors = [`Failed to parse test output: ${error}`]
    }

    return result
  }

  private calculateCoverage(coverageMap: any): number {
    if (!coverageMap) return 0

    let totalStatements = 0
    let coveredStatements = 0

    Object.values(coverageMap).forEach((file: any) => {
      if (file.s) {
        Object.values(file.s).forEach((count: any) => {
          totalStatements++
          if (count > 0) coveredStatements++
        })
      }
    })

    return totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0
  }

  private generateSummary(): TestSummary {
    const totalDuration = Date.now() - this.startTime

    const summary: TestSummary = {
      totalTests: this.results.reduce((sum, r) => sum + r.passed + r.failed + r.skipped, 0),
      totalPassed: this.results.reduce((sum, r) => sum + r.passed, 0),
      totalFailed: this.results.reduce((sum, r) => sum + r.failed, 0),
      totalSkipped: this.results.reduce((sum, r) => sum + r.skipped, 0),
      totalDuration,
      overallCoverage: this.calculateOverallCoverage(),
      categories: this.results,
      qualityGatesPassed: false,
      recommendations: []
    }

    return summary
  }

  private calculateOverallCoverage(): number {
    const coverageResults = this.results.filter(r => r.coverage !== undefined)
    if (coverageResults.length === 0) return 0

    const totalCoverage = coverageResults.reduce((sum, r) => sum + (r.coverage || 0), 0)
    return totalCoverage / coverageResults.length
  }

  private checkQualityGates(summary: TestSummary): { passed: boolean; recommendations: string[] } {
    const recommendations: string[] = []
    let passed = true

    // Check test pass rate
    const passRate = summary.totalTests > 0 ? summary.totalPassed / summary.totalTests : 0
    if (passRate < qualityGates.reliability.minPassRate) {
      passed = false
      recommendations.push(`Test pass rate (${Math.round(passRate * 100)}%) is below minimum (${Math.round(qualityGates.reliability.minPassRate * 100)}%)`)
    }

    // Check coverage
    if (summary.overallCoverage < qualityGates.coverage.minimum) {
      passed = false
      recommendations.push(`Code coverage (${Math.round(summary.overallCoverage)}%) is below minimum (${qualityGates.coverage.minimum}%)`)
    } else if (summary.overallCoverage < qualityGates.coverage.target) {
      recommendations.push(`Consider improving code coverage to reach target (${qualityGates.coverage.target}%)`)
    }

    // Check performance
    this.results.forEach(result => {
      const avgTimePerTest = result.duration / (result.passed + result.failed + result.skipped)
      const maxTime = qualityGates.performance.maxExecutionTime[result.category as keyof typeof qualityGates.performance.maxExecutionTime]
      
      if (maxTime && avgTimePerTest > maxTime) {
        recommendations.push(`${result.category} tests are slower than expected (${Math.round(avgTimePerTest)}ms avg vs ${maxTime}ms max)`)
      }
    })

    // Check for failed tests
    if (summary.totalFailed > 0) {
      passed = false
      recommendations.push(`${summary.totalFailed} test(s) failed - review and fix failing tests`)
    }

    // Performance recommendations
    if (summary.totalDuration > 300000) { // 5 minutes
      recommendations.push('Consider optimizing test execution time or running tests in parallel')
    }

    return { passed, recommendations }
  }

  private async generateReports(summary: TestSummary): Promise<void> {
    try {
      // Generate JSON report
      const jsonReport = {
        timestamp: new Date().toISOString(),
        strategy: this.strategy,
        summary,
        environment: {
          node: process.version,
          platform: process.platform,
          arch: process.arch
        }
      }

      await fs.writeFile(
        path.join(reportingConfig.outputs.json),
        JSON.stringify(jsonReport, null, 2)
      )

      // Generate HTML report
      const htmlReport = this.generateHTMLReport(summary)
      await fs.writeFile(
        path.join(reportingConfig.outputs.html, 'index.html'),
        htmlReport
      )

      console.log(`📊 Reports generated:`)
      console.log(`   JSON: ${reportingConfig.outputs.json}`)
      console.log(`   HTML: ${reportingConfig.outputs.html}/index.html`)

    } catch (error) {
      console.warn('Warning: Could not generate reports:', error)
    }
  }

  private generateHTMLReport(summary: TestSummary): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Results - Advanced Diagram Detection</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 2em; font-weight: bold; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .coverage { color: #17a2b8; }
        .categories { margin-bottom: 30px; }
        .category { background: #f8f9fa; margin-bottom: 15px; padding: 15px; border-radius: 8px; }
        .category h4 { margin: 0 0 10px 0; }
        .progress-bar { background: #e9ecef; height: 20px; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #28a745, #20c997); }
        .recommendations { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; }
        .quality-gates { margin-bottom: 20px; }
        .quality-gate { display: inline-block; padding: 5px 10px; margin: 5px; border-radius: 15px; font-size: 0.9em; }
        .gate-passed { background: #d4edda; color: #155724; }
        .gate-failed { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Test Results</h1>
            <p>Advanced Diagram Detection System - Strategy: ${this.strategy}</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
        </div>

        <div class="quality-gates">
            <h3>Quality Gates</h3>
            <span class="quality-gate ${summary.qualityGatesPassed ? 'gate-passed' : 'gate-failed'}">
                ${summary.qualityGatesPassed ? '✅ Passed' : '❌ Failed'}
            </span>
        </div>

        <div class="summary">
            <div class="metric">
                <h3>Total Tests</h3>
                <div class="value">${summary.totalTests}</div>
            </div>
            <div class="metric">
                <h3>Passed</h3>
                <div class="value passed">${summary.totalPassed}</div>
            </div>
            <div class="metric">
                <h3>Failed</h3>
                <div class="value failed">${summary.totalFailed}</div>
            </div>
            <div class="metric">
                <h3>Coverage</h3>
                <div class="value coverage">${Math.round(summary.overallCoverage)}%</div>
            </div>
            <div class="metric">
                <h3>Duration</h3>
                <div class="value">${Math.round(summary.totalDuration / 1000)}s</div>
            </div>
        </div>

        <div class="categories">
            <h3>Test Categories</h3>
            ${summary.categories.map(category => `
                <div class="category">
                    <h4>${testCategories[category.category]?.name || category.category}</h4>
                    <p>Passed: ${category.passed} | Failed: ${category.failed} | Skipped: ${category.skipped}</p>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${category.passed + category.failed > 0 ? (category.passed / (category.passed + category.failed)) * 100 : 0}%"></div>
                    </div>
                    ${category.coverage ? `<p>Coverage: ${Math.round(category.coverage)}%</p>` : ''}
                </div>
            `).join('')}
        </div>

        ${summary.recommendations.length > 0 ? `
            <div class="recommendations">
                <h3>📋 Recommendations</h3>
                <ul>
                    ${summary.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
    </div>
</body>
</html>
    `
  }

  private printSummary(summary: TestSummary): void {
    console.log('\n' + '='.repeat(60))
    console.log('📊 TEST EXECUTION SUMMARY')
    console.log('='.repeat(60))
    
    console.log(`\n🎯 Overall Results:`)
    console.log(`   Total Tests: ${summary.totalTests}`)
    console.log(`   ✅ Passed: ${summary.totalPassed}`)
    console.log(`   ❌ Failed: ${summary.totalFailed}`)
    console.log(`   ⏭️  Skipped: ${summary.totalSkipped}`)
    console.log(`   📊 Coverage: ${Math.round(summary.overallCoverage)}%`)
    console.log(`   ⏱️  Duration: ${Math.round(summary.totalDuration / 1000)}s`)

    console.log(`\n📋 Category Breakdown:`)
    summary.categories.forEach(category => {
      const total = category.passed + category.failed + category.skipped
      const passRate = total > 0 ? Math.round((category.passed / total) * 100) : 0
      console.log(`   ${testCategories[category.category]?.name || category.category}:`)
      console.log(`     Tests: ${total} | Pass Rate: ${passRate}% | Duration: ${Math.round(category.duration / 1000)}s`)
      if (category.coverage) {
        console.log(`     Coverage: ${Math.round(category.coverage)}%`)
      }
    })

    console.log(`\n🚦 Quality Gates: ${summary.qualityGatesPassed ? '✅ PASSED' : '❌ FAILED'}`)
    
    if (summary.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`)
      summary.recommendations.forEach(rec => console.log(`   • ${rec}`))
    }

    console.log('\n' + '='.repeat(60))
    
    if (summary.totalFailed > 0) {
      console.log('❌ Some tests failed. Please review and fix the issues.')
      process.exit(1)
    } else {
      console.log('✅ All tests passed successfully!')
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  const strategy = (args[0] as keyof typeof executionStrategies) || 'development'

  if (!executionStrategies[strategy]) {
    console.error(`❌ Invalid strategy: ${strategy}`)
    console.log('Available strategies:', Object.keys(executionStrategies).join(', '))
    process.exit(1)
  }

  try {
    const runner = new TestRunner(strategy)
    await runner.run()
  } catch (error) {
    console.error('❌ Test execution failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { TestRunner }