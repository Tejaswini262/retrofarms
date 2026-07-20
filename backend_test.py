#!/usr/bin/env python3
"""
Backend API Test Suite for Retro Farms - Self-Service Credential Update
Tests PATCH /api/auth/me endpoint and security checks
"""

import requests
import json
import sys

BASE_URL = "https://farm-to-table-541.preview.emergentagent.com/api"

# Test credentials from /app/memory/test_credentials.md
ADMIN_EMAIL = "admin@retrofarms.in"
ADMIN_PASSWORD = "admin123"
STAFF_EMAIL = "staff@retrofarms.in"
STAFF_PASSWORD = "staff123"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def log_test(name):
    print(f"\n{Colors.BLUE}[TEST]{Colors.END} {name}")

def log_pass(msg):
    print(f"  {Colors.GREEN}✓{Colors.END} {msg}")

def log_fail(msg):
    print(f"  {Colors.RED}✗{Colors.END} {msg}")

def log_info(msg):
    print(f"  {Colors.YELLOW}ℹ{Colors.END} {msg}")

def admin_login():
    """Login as admin and return session cookie"""
    r = requests.post(f"{BASE_URL}/auth/admin-login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if r.status_code != 200:
        log_fail(f"Admin login failed: {r.status_code} {r.text}")
        return None
    return r.cookies.get('session_token')

def staff_login():
    """Login as staff and return session cookie"""
    r = requests.post(f"{BASE_URL}/auth/admin-login", json={
        "email": STAFF_EMAIL,
        "password": STAFF_PASSWORD
    })
    if r.status_code != 200:
        log_fail(f"Staff login failed: {r.status_code} {r.text}")
        return None
    return r.cookies.get('session_token')

def test_unauthenticated_returns_401():
    """Test 1: Unauthenticated PATCH /api/auth/me returns 401"""
    log_test("Test 1: Unauthenticated PATCH /api/auth/me returns 401")
    
    r = requests.patch(f"{BASE_URL}/auth/me", json={"name": "Test"})
    
    if r.status_code == 401:
        log_pass("Returns 401 without authentication")
        return True
    else:
        log_fail(f"Expected 401, got {r.status_code}")
        return False

def test_update_profile_as_admin():
    """Test 2: Update profile (name, phone) as admin"""
    log_test("Test 2: Update profile (name, phone) as admin")
    
    token = admin_login()
    if not token:
        return False
    
    cookies = {'session_token': token}
    
    # Update name and phone
    r = requests.patch(f"{BASE_URL}/auth/me", 
                      json={"name": "New Admin Name", "phone": "9998887777"},
                      cookies=cookies)
    
    if r.status_code != 200:
        log_fail(f"Update failed: {r.status_code} {r.text}")
        return False
    
    data = r.json()
    
    # Check response has user_public fields
    if 'user_id' not in data or 'email' not in data or 'name' not in data:
        log_fail("Response missing user_public fields")
        return False
    
    # Check password_hash is NOT in response
    if 'password_hash' in data:
        log_fail("SECURITY ISSUE: password_hash leaked in response")
        return False
    
    # Check updated values
    if data['name'] != "New Admin Name":
        log_fail(f"Name not updated: {data['name']}")
        return False
    
    if data['phone'] != "9998887777":
        log_fail(f"Phone not updated: {data['phone']}")
        return False
    
    log_pass("Profile updated successfully")
    log_pass("Response contains user_public fields only (no password_hash)")
    
    # Verify with GET /api/auth/me
    r2 = requests.get(f"{BASE_URL}/auth/me", cookies=cookies)
    if r2.status_code == 200:
        data2 = r2.json()
        if data2['name'] == "New Admin Name" and data2['phone'] == "9998887777":
            log_pass("GET /api/auth/me confirms the update")
        else:
            log_fail("GET /api/auth/me does not reflect updates")
            return False
    
    return True

def test_change_admin_email():
    """Test 3: Change admin email"""
    log_test("Test 3: Change admin email")
    
    token = admin_login()
    if not token:
        return False
    
    cookies = {'session_token': token}
    
    # Change email to admin2@retrofarms.in
    r = requests.patch(f"{BASE_URL}/auth/me", 
                      json={"email": "admin2@retrofarms.in"},
                      cookies=cookies)
    
    if r.status_code != 200:
        log_fail(f"Email change failed: {r.status_code} {r.text}")
        return False
    
    data = r.json()
    if data['email'] != "admin2@retrofarms.in":
        log_fail(f"Email not updated: {data['email']}")
        return False
    
    log_pass("Email changed to admin2@retrofarms.in")
    
    # Verify login works with new email
    r2 = requests.post(f"{BASE_URL}/auth/admin-login", json={
        "email": "admin2@retrofarms.in",
        "password": ADMIN_PASSWORD
    })
    
    if r2.status_code == 200:
        log_pass("Login works with new email (admin2@retrofarms.in)")
    else:
        log_fail(f"Login with new email failed: {r2.status_code}")
        return False
    
    # Change back to original email
    new_token = r2.cookies.get('session_token')
    r3 = requests.patch(f"{BASE_URL}/auth/me", 
                       json={"email": ADMIN_EMAIL},
                       cookies={'session_token': new_token})
    
    if r3.status_code == 200:
        log_pass(f"Email restored to {ADMIN_EMAIL}")
    else:
        log_fail(f"Failed to restore email: {r3.status_code}")
        return False
    
    return True

def test_email_conflict():
    """Test 4: Email conflict - cannot use existing email"""
    log_test("Test 4: Email conflict - cannot use existing email")
    
    token = admin_login()
    if not token:
        return False
    
    cookies = {'session_token': token}
    
    # Try to change admin email to staff email (should fail)
    r = requests.patch(f"{BASE_URL}/auth/me", 
                      json={"email": STAFF_EMAIL},
                      cookies=cookies)
    
    if r.status_code == 400:
        data = r.json()
        if "already in use" in data.get('detail', '').lower():
            log_pass("Returns 400 'Email already in use' for conflict")
            return True
        else:
            log_fail(f"Returns 400 but wrong message: {data.get('detail')}")
            return False
    else:
        log_fail(f"Expected 400, got {r.status_code}")
        return False

def test_change_password_with_verification():
    """Test 5: Change password with current password verification (CRITICAL)"""
    log_test("Test 5: Change password with current password verification (CRITICAL)")
    
    token = admin_login()
    if not token:
        return False
    
    cookies = {'session_token': token}
    
    # Change password from admin123 to newSecure123
    r = requests.patch(f"{BASE_URL}/auth/me", 
                      json={"current_password": ADMIN_PASSWORD, "new_password": "newSecure123"},
                      cookies=cookies)
    
    if r.status_code != 200:
        log_fail(f"Password change failed: {r.status_code} {r.text}")
        return False
    
    log_pass("Password change request succeeded (200)")
    
    # Verify old password now fails
    r2 = requests.post(f"{BASE_URL}/auth/admin-login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if r2.status_code == 401:
        log_pass("Old password (admin123) now fails with 401")
    else:
        log_fail(f"Old password still works! Status: {r2.status_code}")
        return False
    
    # Verify new password works
    r3 = requests.post(f"{BASE_URL}/auth/admin-login", json={
        "email": ADMIN_EMAIL,
        "password": "newSecure123"
    })
    
    if r3.status_code == 200:
        log_pass("New password (newSecure123) works correctly")
    else:
        log_fail(f"New password doesn't work: {r3.status_code}")
        return False
    
    # Restore original password
    new_token = r3.cookies.get('session_token')
    r4 = requests.patch(f"{BASE_URL}/auth/me", 
                       json={"current_password": "newSecure123", "new_password": ADMIN_PASSWORD},
                       cookies={'session_token': new_token})
    
    if r4.status_code == 200:
        log_pass(f"Password restored to {ADMIN_PASSWORD}")
    else:
        log_fail(f"Failed to restore password: {r4.status_code}")
        return False
    
    return True

def test_password_change_fails_without_current():
    """Test 6: Password change fails without current password"""
    log_test("Test 6: Password change fails without current password")
    
    token = admin_login()
    if not token:
        return False
    
    cookies = {'session_token': token}
    
    # Try to change password without current_password
    r = requests.patch(f"{BASE_URL}/auth/me", 
                      json={"new_password": "anotherOne"},
                      cookies=cookies)
    
    if r.status_code == 400:
        data = r.json()
        if "current password required" in data.get('detail', '').lower():
            log_pass("Returns 400 'Current password required'")
            return True
        else:
            log_fail(f"Returns 400 but wrong message: {data.get('detail')}")
            return False
    else:
        log_fail(f"Expected 400, got {r.status_code}")
        return False

def test_password_change_fails_with_wrong_current():
    """Test 7: Password change fails with wrong current password"""
    log_test("Test 7: Password change fails with wrong current password")
    
    token = admin_login()
    if not token:
        return False
    
    cookies = {'session_token': token}
    
    # Try to change password with wrong current_password
    r = requests.patch(f"{BASE_URL}/auth/me", 
                      json={"current_password": "WRONG", "new_password": "anotherOne"},
                      cookies=cookies)
    
    if r.status_code == 401:
        data = r.json()
        if "current password is incorrect" in data.get('detail', '').lower():
            log_pass("Returns 401 'Current password is incorrect'")
            return True
        else:
            log_fail(f"Returns 401 but wrong message: {data.get('detail')}")
            return False
    else:
        log_fail(f"Expected 401, got {r.status_code}")
        return False

def test_password_too_short():
    """Test 8: Password too short validation"""
    log_test("Test 8: Password too short validation")
    
    token = admin_login()
    if not token:
        return False
    
    cookies = {'session_token': token}
    
    # Try to set password shorter than 6 characters
    r = requests.patch(f"{BASE_URL}/auth/me", 
                      json={"current_password": ADMIN_PASSWORD, "new_password": "abc"},
                      cookies=cookies)
    
    if r.status_code == 400:
        data = r.json()
        if "at least 6 characters" in data.get('detail', '').lower():
            log_pass("Returns 400 'Password must be at least 6 characters'")
            return True
        else:
            log_fail(f"Returns 400 but wrong message: {data.get('detail')}")
            return False
    else:
        log_fail(f"Expected 400, got {r.status_code}")
        return False

def test_staff_profile_update():
    """Test 9: Same works for staff"""
    log_test("Test 9: Staff can update their own profile")
    
    token = staff_login()
    if not token:
        return False
    
    cookies = {'session_token': token}
    
    # Update staff name
    r = requests.patch(f"{BASE_URL}/auth/me", 
                      json={"name": "Delivery Staff Updated"},
                      cookies=cookies)
    
    if r.status_code != 200:
        log_fail(f"Staff profile update failed: {r.status_code} {r.text}")
        return False
    
    data = r.json()
    if data['name'] != "Delivery Staff Updated":
        log_fail(f"Name not updated: {data['name']}")
        return False
    
    log_pass("Staff profile updated successfully")
    
    # Test staff password change
    r2 = requests.patch(f"{BASE_URL}/auth/me", 
                       json={"current_password": STAFF_PASSWORD, "new_password": "newStaff123"},
                       cookies=cookies)
    
    if r2.status_code != 200:
        log_fail(f"Staff password change failed: {r2.status_code}")
        return False
    
    log_pass("Staff password change succeeded")
    
    # Verify new password works
    r3 = requests.post(f"{BASE_URL}/auth/admin-login", json={
        "email": STAFF_EMAIL,
        "password": "newStaff123"
    })
    
    if r3.status_code == 200:
        log_pass("New staff password works")
    else:
        log_fail(f"New staff password doesn't work: {r3.status_code}")
        return False
    
    # Restore original password
    new_token = r3.cookies.get('session_token')
    r4 = requests.patch(f"{BASE_URL}/auth/me", 
                       json={"current_password": "newStaff123", "new_password": STAFF_PASSWORD},
                       cookies={'session_token': new_token})
    
    if r4.status_code == 200:
        log_pass("Staff password restored")
    else:
        log_fail(f"Failed to restore staff password: {r4.status_code}")
        return False
    
    return True

def test_no_password_hash_leak():
    """Test 10: Security check - no password_hash leak"""
    log_test("Test 10: Security check - no password_hash leak in any endpoint")
    
    token = admin_login()
    if not token:
        return False
    
    cookies = {'session_token': token}
    all_pass = True
    
    # Check GET /api/auth/me
    r1 = requests.get(f"{BASE_URL}/auth/me", cookies=cookies)
    if r1.status_code == 200:
        data1 = r1.json()
        if 'password_hash' in data1:
            log_fail("SECURITY ISSUE: GET /api/auth/me leaks password_hash")
            all_pass = False
        else:
            log_pass("GET /api/auth/me does NOT leak password_hash")
    else:
        log_fail(f"GET /api/auth/me failed: {r1.status_code}")
        all_pass = False
    
    # Check GET /api/admin/staff
    r2 = requests.get(f"{BASE_URL}/admin/staff", cookies=cookies)
    if r2.status_code == 200:
        data2 = r2.json()
        has_leak = False
        for user in data2:
            if 'password_hash' in user:
                has_leak = True
                break
        if has_leak:
            log_fail("SECURITY ISSUE: GET /api/admin/staff leaks password_hash")
            all_pass = False
        else:
            log_pass("GET /api/admin/staff does NOT leak password_hash")
    else:
        log_fail(f"GET /api/admin/staff failed: {r2.status_code}")
        all_pass = False
    
    # Check GET /api/admin/customers
    r3 = requests.get(f"{BASE_URL}/admin/customers", cookies=cookies)
    if r3.status_code == 200:
        data3 = r3.json()
        has_leak = False
        for user in data3:
            if 'password_hash' in user:
                has_leak = True
                break
        if has_leak:
            log_fail("SECURITY ISSUE: GET /api/admin/customers leaks password_hash")
            all_pass = False
        else:
            log_pass("GET /api/admin/customers does NOT leak password_hash")
    else:
        log_fail(f"GET /api/admin/customers failed: {r3.status_code}")
        all_pass = False
    
    # Check GET /api/admin/offline-customers
    r4 = requests.get(f"{BASE_URL}/admin/offline-customers", cookies=cookies)
    if r4.status_code == 200:
        data4 = r4.json()
        has_leak = False
        for user in data4:
            if 'password_hash' in user:
                has_leak = True
                break
        if has_leak:
            log_fail("SECURITY ISSUE: GET /api/admin/offline-customers leaks password_hash")
            all_pass = False
        else:
            log_pass("GET /api/admin/offline-customers does NOT leak password_hash")
    else:
        log_fail(f"GET /api/admin/offline-customers failed: {r4.status_code}")
        all_pass = False
    
    return all_pass

def test_regression():
    """Test 11: Regression - existing endpoints still work"""
    log_test("Test 11: Regression - existing endpoints still work")
    
    all_pass = True
    
    # Test GET /api/products
    r1 = requests.get(f"{BASE_URL}/products")
    if r1.status_code == 200:
        log_pass("GET /api/products still works")
    else:
        log_fail(f"GET /api/products failed: {r1.status_code}")
        all_pass = False
    
    # Test POST /api/auth/admin-login with restored credentials
    r2 = requests.post(f"{BASE_URL}/auth/admin-login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if r2.status_code == 200:
        log_pass("POST /api/auth/admin-login still works with restored credentials")
    else:
        log_fail(f"POST /api/auth/admin-login failed: {r2.status_code}")
        all_pass = False
    
    return all_pass

def main():
    print(f"\n{Colors.BLUE}{'='*70}{Colors.END}")
    print(f"{Colors.BLUE}Retro Farms Backend API Test Suite{Colors.END}")
    print(f"{Colors.BLUE}Testing: Self-Service Credential Update (PATCH /api/auth/me){Colors.END}")
    print(f"{Colors.BLUE}{'='*70}{Colors.END}")
    
    tests = [
        test_unauthenticated_returns_401,
        test_update_profile_as_admin,
        test_change_admin_email,
        test_email_conflict,
        test_change_password_with_verification,
        test_password_change_fails_without_current,
        test_password_change_fails_with_wrong_current,
        test_password_too_short,
        test_staff_profile_update,
        test_no_password_hash_leak,
        test_regression,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            log_fail(f"Test raised exception: {e}")
            failed += 1
    
    print(f"\n{Colors.BLUE}{'='*70}{Colors.END}")
    print(f"{Colors.GREEN}Passed: {passed}{Colors.END}")
    print(f"{Colors.RED}Failed: {failed}{Colors.END}")
    print(f"{Colors.BLUE}{'='*70}{Colors.END}\n")
    
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
