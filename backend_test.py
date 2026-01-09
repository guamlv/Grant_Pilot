import requests
import sys
import json
from datetime import datetime

class GrantPilotAPITester:
    def __init__(self, base_url="https://readersmatch.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_grant_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=30):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=timeout)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=timeout)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 500:
                        print(f"   Response: {response_data}")
                    elif isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                    return success, response_data
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Error: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health check endpoint"""
        return self.run_test(
            "Health Check",
            "GET",
            "api/",
            200
        )

    def test_seed_data(self):
        """Seed demo data"""
        return self.run_test(
            "Seed Demo Data",
            "POST",
            "api/seed",
            200
        )

    def test_get_grants(self):
        """Test getting all grants"""
        return self.run_test(
            "Get All Grants",
            "GET",
            "api/grants",
            200
        )

    def test_create_grant(self):
        """Test creating a new grant"""
        grant_data = {
            "title": "Test Grant",
            "funder": "Test Funder",
            "award_amount": 100000,
            "status": "Prospect",
            "description": "A test grant for API testing"
        }
        success, response = self.run_test(
            "Create Grant",
            "POST",
            "api/grants",
            200,
            data=grant_data
        )
        if success and 'id' in response:
            self.created_grant_id = response['id']
            print(f"   Created grant ID: {self.created_grant_id}")
        return success, response

    def test_get_specific_grant(self):
        """Test getting a specific grant"""
        if not self.created_grant_id:
            print("❌ Skipping - No grant ID available")
            return False, {}
        
        return self.run_test(
            "Get Specific Grant",
            "GET",
            f"api/grants/{self.created_grant_id}",
            200
        )

    def test_create_task(self):
        """Test creating a task"""
        if not self.created_grant_id:
            print("❌ Skipping - No grant ID available")
            return False, {}
            
        task_data = {
            "grant_id": self.created_grant_id,
            "description": "Test task",
            "due_date": "2025-12-31"
        }
        return self.run_test(
            "Create Task",
            "POST",
            "api/tasks",
            200,
            data=task_data
        )

    def test_get_tasks(self):
        """Test getting tasks for a grant"""
        if not self.created_grant_id:
            print("❌ Skipping - No grant ID available")
            return False, {}
            
        return self.run_test(
            "Get Tasks for Grant",
            "GET",
            f"api/tasks?grant_id={self.created_grant_id}",
            200
        )

    def test_ai_draft_proposal(self):
        """Test AI draft proposal endpoint"""
        proposal_data = {
            "grant_title": "Test Grant",
            "section": "Abstract",
            "context": "A technology grant",
            "tone": "Professional"
        }
        return self.run_test(
            "AI Draft Proposal",
            "POST",
            "api/ai/draft-proposal",
            200,
            data=proposal_data,
            timeout=60  # AI calls may take longer
        )

    def test_delete_grant(self):
        """Test deleting a grant"""
        if not self.created_grant_id:
            print("❌ Skipping - No grant ID available")
            return False, {}
            
        return self.run_test(
            "Delete Grant",
            "DELETE",
            f"api/grants/{self.created_grant_id}",
            200
        )

    def test_settings_endpoints(self):
        """Test settings endpoints"""
        # Get settings
        success1, _ = self.run_test(
            "Get Settings",
            "GET",
            "api/settings",
            200
        )
        
        # Update settings
        settings_data = {
            "theme": "zen",
            "user_name": "Test User"
        }
        success2, _ = self.run_test(
            "Update Settings",
            "PUT",
            "api/settings",
            200,
            data=settings_data
        )
        
        return success1 and success2

def main():
    print("🚀 Starting GrantPilot Intelligence Suite API Tests")
    print("=" * 60)
    
    tester = GrantPilotAPITester()
    
    # Test sequence
    tests = [
        ("Health Check", tester.test_health_check),
        ("Seed Demo Data", tester.test_seed_data),
        ("Get All Grants", tester.test_get_grants),
        ("Create Grant", tester.test_create_grant),
        ("Get Specific Grant", tester.test_get_specific_grant),
        ("Create Task", tester.test_create_task),
        ("Get Tasks", tester.test_get_tasks),
        ("AI Draft Proposal", tester.test_ai_draft_proposal),
        ("Settings Endpoints", tester.test_settings_endpoints),
        ("Delete Grant", tester.test_delete_grant),
    ]
    
    for test_name, test_func in tests:
        try:
            test_func()
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())