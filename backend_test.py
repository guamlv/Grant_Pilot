import requests
import sys
import json
import base64
from datetime import datetime, timedelta

class GrantPilotAPITester:
    def __init__(self, base_url="https://readersmatch.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_ids = {}  # Store created resource IDs for cleanup

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_dashboard(self):
        """Test dashboard metrics API"""
        success, response = self.run_test(
            "Dashboard Metrics",
            "GET",
            "dashboard",
            200
        )
        if success:
            required_keys = ['pipeline', 'total_pending', 'total_awarded', 'upcoming_deadlines']
            for key in required_keys:
                if key not in response:
                    print(f"   ⚠️  Missing key: {key}")
                    return False
            print(f"   📊 Pipeline: {response.get('pipeline', {})}")
            print(f"   💰 Total Pending: ${response.get('total_pending', 0):,}")
            print(f"   🏆 Total Awarded: ${response.get('total_awarded', 0):,}")
        return success

    def test_grants_crud(self):
        """Test grants CRUD operations"""
        # Create grant
        grant_data = {
            "title": "Test Grant for Education",
            "funder_name": "Test Foundation",
            "amount_requested": 50000,
            "deadline": "2025-06-30",
            "stage": "researching",
            "program": "Youth Education"
        }
        
        success, response = self.run_test(
            "Create Grant",
            "POST",
            "grants",
            200,
            data=grant_data
        )
        
        if not success:
            return False
            
        grant_id = response.get('id')
        if grant_id:
            self.created_ids['grant'] = grant_id
            print(f"   📝 Created grant ID: {grant_id}")
        
        # List grants
        success, response = self.run_test(
            "List Grants",
            "GET",
            "grants",
            200
        )
        
        if not success:
            return False
            
        # Update grant stage
        update_data = {"stage": "awarded", "amount_awarded": 45000}
        success, response = self.run_test(
            f"Update Grant Stage",
            "PUT",
            f"grants/{grant_id}",
            200,
            data=update_data
        )
        
        return success

    def test_content_library(self):
        """Test content library operations"""
        content_data = {
            "category": "mission",
            "title": "Mission Statement",
            "content": "We serve communities by providing educational opportunities and resources to underserved youth.",
            "tags": ["general", "mission"]
        }
        
        success, response = self.run_test(
            "Create Content",
            "POST",
            "content",
            200,
            data=content_data
        )
        
        if success:
            content_id = response.get('id')
            if content_id:
                self.created_ids['content'] = content_id
                print(f"   📄 Created content ID: {content_id}")
        
        # List content
        success, response = self.run_test(
            "List Content",
            "GET",
            "content",
            200
        )
        
        return success

    def test_funders(self):
        """Test funder operations"""
        funder_data = {
            "name": "Gates Foundation",
            "website": "https://gatesfoundation.org",
            "priorities": "Global health, education, poverty alleviation",
            "typical_award_range": "$100K - $2M",
            "application_requirements": ["LOI required", "Full proposal", "Budget narrative"]
        }
        
        success, response = self.run_test(
            "Create Funder",
            "POST",
            "funders",
            200,
            data=funder_data
        )
        
        if success:
            funder_id = response.get('id')
            if funder_id:
                self.created_ids['funder'] = funder_id
                print(f"   🏢 Created funder ID: {funder_id}")
        
        # List funders
        success, response = self.run_test(
            "List Funders",
            "GET",
            "funders",
            200
        )
        
        return success

    def test_reporting_requirements(self):
        """Test reporting requirements"""
        if 'grant' not in self.created_ids:
            print("❌ No grant ID available for reporting test")
            return False
            
        grant_id = self.created_ids['grant']
        
        reporting_data = {
            "grant_id": grant_id,
            "report_type": "financial",
            "title": "Q1 Financial Report",
            "description": "Quarterly financial report showing expenditures and remaining balance",
            "due_date": "2025-03-31",
            "frequency": "quarterly"
        }
        
        success, response = self.run_test(
            "Create Reporting Requirement",
            "POST",
            "reporting",
            200,
            data=reporting_data
        )
        
        if success:
            report_id = response.get('id')
            if report_id:
                self.created_ids['reporting'] = report_id
                print(f"   📋 Created reporting requirement ID: {report_id}")
        
        # List reporting requirements for grant
        success, response = self.run_test(
            "List Reporting Requirements",
            "GET",
            "reporting",
            200,
            params={"grant_id": grant_id}
        )
        
        return success

    def test_outcomes(self):
        """Test outcome metrics"""
        outcome_data = {
            "program": "Youth Services",
            "metric_type": "output",
            "title": "Youth Served",
            "value": "1,500",
            "time_period": "2024 Academic Year",
            "source": "Program database"
        }
        
        success, response = self.run_test(
            "Create Outcome Metric",
            "POST",
            "outcomes",
            200,
            data=outcome_data
        )
        
        if success:
            outcome_id = response.get('id')
            if outcome_id:
                self.created_ids['outcome'] = outcome_id
                print(f"   📈 Created outcome ID: {outcome_id}")
        
        # List outcomes
        success, response = self.run_test(
            "List Outcomes",
            "GET",
            "outcomes",
            200
        )
        
        return success

    def test_ai_award_extraction(self):
        """Test AI award document extraction"""
        if 'grant' not in self.created_ids:
            print("❌ No grant ID available for AI extraction test")
            return False
            
        grant_id = self.created_ids['grant']
        
        # Sample award document text
        sample_document = """
        GRANT AWARD NOTIFICATION
        
        Congratulations! Your grant application has been approved.
        
        Award Details:
        - Grant Amount: $45,000
        - Grant Period: January 1, 2025 - December 31, 2025
        - Funder: Test Foundation
        
        Reporting Requirements:
        1. Quarterly Financial Reports due 30 days after each quarter end
        2. Annual Narrative Report due January 31, 2026
        3. Final Financial Report due February 28, 2026
        
        Compliance Requirements:
        - All expenditures must be pre-approved for amounts over $5,000
        - Maintain detailed records for 7 years
        - Acknowledge funder in all publications
        """
        
        # Encode as base64
        encoded_doc = base64.b64encode(sample_document.encode('utf-8')).decode('utf-8')
        
        extraction_data = {
            "grant_id": grant_id,
            "base64_data": encoded_doc,
            "mime_type": "text/plain",
            "filename": "award_letter.txt"
        }
        
        success, response = self.run_test(
            "AI Award Document Extraction",
            "POST",
            "ai/extract-award",
            200,
            data=extraction_data
        )
        
        if success:
            print(f"   🤖 Created {response.get('created_reports', 0)} reporting requirements")
            print(f"   🤖 Created {response.get('created_compliance', 0)} compliance items")
        
        return success

    def test_settings(self):
        """Test organization settings"""
        success, response = self.run_test(
            "Get Settings",
            "GET",
            "settings",
            200
        )
        
        if success:
            # Update settings
            settings_data = {
                "id": "default",
                "org_name": "Test Nonprofit Organization",
                "ein": "12-3456789",
                "fiscal_year_end": "12-31",
                "primary_contact": "John Doe",
                "primary_email": "john@testnonprofit.org"
            }
            
            success, response = self.run_test(
                "Update Settings",
                "PUT",
                "settings",
                200,
                data=settings_data
            )
        
        return success

    def test_calendar_export(self):
        """Test calendar export functionality"""
        success, response = self.run_test(
            "Calendar Export",
            "GET",
            "calendar/export",
            200
        )
        
        if success and 'events' in response:
            print(f"   📅 Found {len(response['events'])} calendar events")
        
        return success

    def cleanup(self):
        """Clean up created test data"""
        print(f"\n🧹 Cleaning up test data...")
        
        # Delete in reverse order of dependencies
        cleanup_order = [
            ('reporting', 'reporting'),
            ('outcome', 'outcomes'),
            ('content', 'content'),
            ('funder', 'funders'),
            ('grant', 'grants')
        ]
        
        for key, endpoint in cleanup_order:
            if key in self.created_ids:
                resource_id = self.created_ids[key]
                try:
                    success, _ = self.run_test(
                        f"Delete {key}",
                        "DELETE",
                        f"{endpoint}/{resource_id}",
                        200
                    )
                    if success:
                        print(f"   ✅ Deleted {key}: {resource_id}")
                except:
                    print(f"   ⚠️  Failed to delete {key}: {resource_id}")

def main():
    print("🚀 Starting GrantPilot API Tests")
    print("=" * 50)
    
    tester = GrantPilotAPITester()
    
    # Run all tests
    tests = [
        ("Dashboard", tester.test_dashboard),
        ("Grants CRUD", tester.test_grants_crud),
        ("Content Library", tester.test_content_library),
        ("Funders", tester.test_funders),
        ("Reporting Requirements", tester.test_reporting_requirements),
        ("Outcomes", tester.test_outcomes),
        ("AI Award Extraction", tester.test_ai_award_extraction),
        ("Settings", tester.test_settings),
        ("Calendar Export", tester.test_calendar_export)
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            failed_tests.append(test_name)
    
    # Cleanup
    tester.cleanup()
    
    # Print results
    print(f"\n{'='*50}")
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if failed_tests:
        print(f"❌ Failed tests: {', '.join(failed_tests)}")
        return 1
    else:
        print("✅ All tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())