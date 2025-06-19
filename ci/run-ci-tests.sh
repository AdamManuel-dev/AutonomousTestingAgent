#!/bin/bash

# Test Running Agent CI Script
# This script is designed to be used in CI/CD pipelines

set -e # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CONFIG_FILE="${TEST_AGENT_CONFIG:-ci/test-agent-ci.config.json}"
PROJECT_ROOT="${PROJECT_ROOT:-.}"
MAX_RETRIES="${MAX_RETRIES:-3}"
COVERAGE_THRESHOLD="${COVERAGE_THRESHOLD:-80}"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."

    if ! command -v node &>/dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi

    if ! command -v test-agent &>/dev/null; then
        log_warn "Test agent not found globally, installing..."
        npm install -g test-running-agent
    fi

    log_info "Dependencies OK"
}

detect_changed_files() {
    log_info "Detecting changed files..."

    if [ -n "$CI_PULL_REQUEST" ] || [ -n "$GITHUB_HEAD_REF" ]; then
        # Pull request mode
        BASE_BRANCH="${BASE_BRANCH:-main}"
        CHANGED_FILES=$(git diff --name-only "origin/$BASE_BRANCH"...HEAD 2>/dev/null || echo "")
    else
        # Regular commit mode
        CHANGED_FILES=$(git diff --name-only HEAD~1...HEAD 2>/dev/null || echo "")
    fi

    if [ -z "$CHANGED_FILES" ]; then
        log_warn "No changed files detected, running full test suite"
        CHANGED_FILES="all"
    else
        log_info "Changed files detected:"
        echo "$CHANGED_FILES" | head -10
        CHANGED_COUNT=$(echo "$CHANGED_FILES" | wc -l)
        if [ "$CHANGED_COUNT" -gt 10 ]; then
            log_info "... and $((CHANGED_COUNT - 10)) more files"
        fi
    fi

    export CHANGED_FILES
}

run_smart_tests() {
    log_info "Running smart test selection..."

    local retry_count=0
    local test_passed=false

    while [ $retry_count -lt $MAX_RETRIES ] && [ "$test_passed" = false ]; do
        if [ "$retry_count" -gt 0 ]; then
            log_warn "Retry attempt $retry_count of $MAX_RETRIES"
        fi

        if [ "$CHANGED_FILES" = "all" ]; then
            test-agent test \
                --config "$CONFIG_FILE" \
                --coverage \
                --junit test-results/junit.xml \
                --json test-results/summary.json &&
                test_passed=true || true
        else
            test-agent test \
                --config "$CONFIG_FILE" \
                --files "$CHANGED_FILES" \
                --coverage \
                --junit test-results/junit.xml \
                --json test-results/summary.json &&
                test_passed=true || true
        fi

        retry_count=$((retry_count + 1))
    done

    if [ "$test_passed" = false ]; then
        log_error "Tests failed after $MAX_RETRIES attempts"
        return 1
    fi

    log_info "Tests completed successfully"
}

check_coverage() {
    log_info "Checking coverage thresholds..."

    if ! test-agent coverage \
        --config "$CONFIG_FILE" \
        --check-thresholds \
        --fail-under "$COVERAGE_THRESHOLD"; then
        log_error "Coverage is below threshold ($COVERAGE_THRESHOLD%)"
        return 1
    fi

    log_info "Coverage check passed"
}

analyze_complexity() {
    log_info "Analyzing code complexity..."

    if [ "$CHANGED_FILES" != "all" ]; then
        test-agent complexity \
            --config "$CONFIG_FILE" \
            --files "$CHANGED_FILES" \
            --format json \
            --output complexity-report.json \
            --fail-on-high || {
            log_error "High complexity detected in changed files"
            return 1
        }
    else
        test-agent complexity \
            --config "$CONFIG_FILE" \
            --format json \
            --output complexity-report.json \
            --fail-on-high || {
            log_error "High complexity detected"
            return 1
        }
    fi

    log_info "Complexity check passed"
}

generate_reports() {
    log_info "Generating reports..."

    # Create markdown summary for PR comments
    if [ -n "$CI_PULL_REQUEST" ] || [ -n "$GITHUB_HEAD_REF" ]; then
        test-agent report \
            --config "$CONFIG_FILE" \
            --format markdown \
            --output test-results/pr-comment.md \
            --include-coverage \
            --include-complexity \
            --include-test-summary
    fi

    # Generate HTML report
    test-agent report \
        --config "$CONFIG_FILE" \
        --format html \
        --output test-results/html

    log_info "Reports generated"
}

upload_artifacts() {
    log_info "Preparing artifacts..."

    # Create artifacts directory
    mkdir -p artifacts

    # Copy relevant files
    cp -r coverage artifacts/ 2>/dev/null || true
    cp -r test-results artifacts/ 2>/dev/null || true
    cp complexity-report.json artifacts/ 2>/dev/null || true

    # Create summary file
    cat >artifacts/summary.txt <<EOF
Test Running Agent CI Summary
============================
Date: $(date)
Branch: $(git branch --show-current)
Commit: $(git rev-parse --short HEAD)
Changed Files: $(echo "$CHANGED_FILES" | wc -l)

Results stored in:
- coverage/
- test-results/
- complexity-report.json
EOF

    log_info "Artifacts prepared in ./artifacts"
}

send_notifications() {
    log_info "Sending notifications..."

    local status="$1"

    test-agent notify \
        --config "$CONFIG_FILE" \
        --status "$status" \
        --build-url "${CI_BUILD_URL:-$BUILD_URL}" \
        --build-number "${CI_BUILD_NUMBER:-$BUILD_NUMBER}" \
        --branch "${CI_BRANCH:-$(git branch --show-current)}" \
        --commit "${CI_COMMIT:-$(git rev-parse --short HEAD)}" || {
        log_warn "Failed to send notifications"
    }
}

# Main execution
main() {
    log_info "Starting Test Running Agent CI Pipeline"
    log_info "Config: $CONFIG_FILE"
    log_info "Project: $PROJECT_ROOT"

    # Change to project directory
    cd "$PROJECT_ROOT"

    # Execute pipeline steps
    check_dependencies
    detect_changed_files

    # Run tests and checks
    local exit_code=0

    run_smart_tests || exit_code=1

    if [ $exit_code -eq 0 ]; then
        check_coverage || exit_code=1
    fi

    if [ $exit_code -eq 0 ]; then
        analyze_complexity || exit_code=1
    fi

    # Always generate reports and artifacts
    generate_reports
    upload_artifacts

    # Send notifications
    if [ $exit_code -eq 0 ]; then
        send_notifications "success"
        log_info "CI Pipeline completed successfully"
    else
        send_notifications "failure"
        log_error "CI Pipeline failed"
    fi

    exit $exit_code
}

# Run main function
main "$@"
