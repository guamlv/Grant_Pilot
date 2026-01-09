#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class GrantPilotAPITester:
    def __init__(self, base_url="https://readersmatch.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status=200, data=None, check_content=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                
                # Additional content checks
                if check_content and response.status_code == 200:
                    try:
                        json_data = response.json()
                        content_check = check_content(json_data)
                        if content_check:
                            print(f"   ✅ Content check passed: {content_check}")
                        else:
                            print(f"   ⚠️  Content check failed")
                            success = False
                    except Exception as e:
                        print(f"   ⚠️  Content check error: {e}")
                
                return success, response.json() if response.status_code == 200 else {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                if response.status_code >= 400:
                    try:
                        error_detail = response.json()
                        print(f"   Error: {error_detail}")
                    except:
                        print(f"   Error: {response.text}")
                self.failed_tests.append(f"{name} - Status {response.status_code}")
                return False, {}

        except requests.exceptions.RequestException as e:
            print(f"❌ Failed - Network Error: {str(e)}")
            self.failed_tests.append(f"{name} - Network Error: {str(e)}")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append(f"{name} - Error: {str(e)}")
            return False, {}

    def test_dashboard_api(self):
        """Test dashboard endpoint with populated data"""
        def check_dashboard_content(data):
            required_keys = ['pipeline', 'total_pending', 'total_awarded', 'upcoming_deadlines']
            missing = [key for key in required_keys if key not in data]
            if missing:
                return f"Missing keys: {missing}"
            
            # Check if pipeline has data
            pipeline = data.get('pipeline', {})
            total_grants = sum(pipeline.values()) if pipeline else 0
            if total_grants == 0:
                return "No grants in pipeline - demo data may not be seeded"
            
            return f"Pipeline has {total_grants} grants, ${data.get('total_awarded', 0):,} awarded"

        return self.run_test(
            "Dashboard API",
            "GET",
            "dashboard",
            200,
            check_content=check_dashboard_content
        )

    def test_budget_templates(self):
        """Test budget templates endpoints"""
        # Test getting all templates
        success1, templates = self.run_test(
            "Budget Templates List",
            "GET",
            "budget-templates",
            200,
            check_content=lambda data: f"Found {len(data)} templates" if isinstance(data, list) and len(data) >= 4 else "Expected 4+ templates"
        )
        
        # Test getting specific template
        success2, template = self.run_test(
            "Foundation General Template",
            "GET",
            "budget-templates/foundation_general",
            200,
            check_content=lambda data: f"Template has {len(data.get('line_items', []))} line items" if len(data.get('line_items', [])) >= 9 else "Expected 9+ line items"
        )
        
        return success1 and success2

    def test_content_library(self):
        """Test content library endpoint"""
        def check_content(data):
            if not isinstance(data, list):
                return "Expected list of content items"
            if len(data) < 8:
                return f"Expected 8+ content items, got {len(data)}"
            
            categories = set(item.get('category') for item in data)
            expected_categories = {'mission', 'history', 'leadership', 'programs', 'financials', 'boilerplate'}
            missing_cats = expected_categories - categories
            if missing_cats:
                return f"Missing categories: {missing_cats}"
            
            return f"Found {len(data)} content items with categories: {sorted(categories)}"

        return self.run_test(
            "Content Library",
            "GET",
            "content",
            200,
            check_content=check_content
        )

    def test_funders(self):
        """Test funders endpoint"""
        def check_funders(data):
            if not isinstance(data, list):
                return "Expected list of funders"
            if len(data) < 3:
                return f"Expected 3+ funders, got {len(data)}"
            
            funder_names = [f.get('name', '') for f in data]
            expected_funders = ['Robert Wood Johnson Foundation', 'The Kresge Foundation', 'Community Foundation']
            
            found_expected = sum(1 for expected in expected_funders if any(expected in name for name in funder_names))
            return f"Found {len(data)} funders, {found_expected}/3 expected funders present"

        return self.run_test(
            "Funders List",
            "GET",
            "funders",
            200,
            check_content=check_funders
        )

    def test_grants(self):
        """Test grants endpoint"""
        def check_grants(data):
            if not isinstance(data, list):
                return "Expected list of grants"
            if len(data) < 4:
                return f"Expected 4+ grants, got {len(data)}"
            
            stages = [g.get('stage') for g in data]
            stage_counts = {}
            for stage in stages:
                stage_counts[stage] = stage_counts.get(stage, 0) + 1
            
            # Check for specific grants mentioned in requirements
            titles = [g.get('title', '') for g in data]
            youth_health = any('Youth Health Equity' in title for title in titles)
            mental_health = any('Mental Health First Aid' in title for title in titles)
            
            return f"Found {len(data)} grants. Stages: {stage_counts}. Key grants: Youth Health={youth_health}, Mental Health={mental_health}"

        return self.run_test(
            "Grants List",
            "GET",
            "grants",
            200,
            check_content=check_grants
        )

    def test_outcomes(self):
        """Test outcomes endpoint"""
        def check_outcomes(data):
            if not isinstance(data, list):
                return "Expected list of outcomes"
            if len(data) < 10:
                return f"Expected 10+ outcomes, got {len(data)}"
            
            metric_types = set(o.get('metric_type') for o in data)
            programs = set(o.get('program') for o in data)
            
            expected_types = {'output', 'outcome', 'demographic', 'testimonial'}
            expected_programs = {'Youth Health', 'CHW Training', 'General'}
            
            return f"Found {len(data)} outcomes. Types: {metric_types & expected_types}. Programs: {programs & expected_programs}"

        return self.run_test(
            "Outcomes Bank",
            "GET",
            "outcomes",
            200,
            check_content=check_outcomes
        )

    def test_ai_extraction(self):
        """Test AI extraction endpoint"""
        sample_award_text = """
        GRANT AWARD NOTIFICATION
        
        Congratulations! Your organization has been awarded $50,000 for the Community Health Initiative.
        
        Grant Period: January 1, 2025 - December 31, 2025
        
        REPORTING REQUIREMENTS:
        - Quarterly financial reports due 15 days after each quarter end
        - Annual narrative report due January 31, 2026
        - Final report (financial and narrative) due February 28, 2026
        
        COMPLIANCE REQUIREMENTS:
        - All expenditures must be pre-approved for amounts over $5,000
        - Acknowledge funder in all materials and publications
        - Maintain detailed time and effort records for all staff
        """
        
        # Create a test grant first (we'll use a dummy ID)
        test_grant_id = "test-grant-123"
        
        import base64
        encoded_text = base64.b64encode(sample_award_text.encode()).decode()
        
        test_data = {
            "grant_id": test_grant_id,
            "base64_data": encoded_text,
            "mime_type": "text/plain",
            "filename": "award_letter.txt"
        }

        def check_extraction(data):
            if 'extracted' not in data:
                return "Missing 'extracted' key in response"
            
            extracted = data['extracted']
            
            # Check for reporting requirements
            reports = extracted.get('reporting_requirements', [])
            compliance = extracted.get('compliance_items', [])
            
            return f"Extracted {len(reports)} reporting requirements, {len(compliance)} compliance items"

        return self.run_test(
            "AI Award Extraction",
            "POST",
            "ai/extract-award",
            200,
            data=test_data,
            check_content=check_extraction
        )

    def test_seed_demo_data(self):
        """Test seeding demo data"""
        def check_seed_response(data):
            if data.get('seeded') is False and 'already exists' in data.get('message', ''):
                return "Demo data already exists (expected)"
            elif data.get('seeded') is True:
                summary = data.get('summary', {})
                return f"Seeded: {summary.get('funders', 0)} funders, {summary.get('grants', 0)} grants, {summary.get('content', 0)} content items"
            else:
                return "Unexpected seed response"

        return self.run_test(
            "Seed Demo Data",
            "POST",
            "seed-demo",
            200,
            check_content=check_seed_response
        )

def main():
    print("🚀 Starting GrantPilot Backend API Tests")
    print("=" * 50)
    
    tester = GrantPilotAPITester()
    
    # Test basic connectivity first
    basic_success, _ = tester.run_test("API Root", "GET", "", 200)
    if not basic_success:
        print("\n❌ Basic API connectivity failed. Stopping tests.")
        return 1
    
    # Seed demo data first
    print("\n📊 Seeding Demo Data...")
    tester.test_seed_demo_data()
    
    # Run all API tests
    print("\n🔍 Testing Core APIs...")
    
    test_results = [
        ("Dashboard", tester.test_dashboard_api),
        ("Budget Templates", tester.test_budget_templates),
        ("Content Library", tester.test_content_library),
        ("Funders", tester.test_funders),
        ("Grants", tester.test_grants),
        ("Outcomes", tester.test_outcomes),
        ("AI Extraction", tester.test_ai_extraction),
    ]
    
    for test_name, test_func in test_results:
        print(f"\n--- {test_name} Tests ---")
        try:
            test_func()
        except Exception as e:
            print(f"❌ {test_name} test failed with exception: {e}")
            tester.failed_tests.append(f"{test_name} - Exception: {e}")
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS")
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if tester.failed_tests:
        print(f"\n❌ FAILED TESTS ({len(tester.failed_tests)}):")
        for i, failure in enumerate(tester.failed_tests, 1):
            print(f"   {i}. {failure}")
    else:
        print(f"\n✅ ALL TESTS PASSED!")
    
    return 0 if len(tester.failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())