import json
from datetime import date, timedelta
from unittest.mock import patch
from urllib.error import URLError

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, override_settings
from rest_framework.test import APITestCase

from students.age import age_from_date_of_birth, age_guidance
from students.models import StudentProfile
from kindling_platform.serializers import ensure_subscription


class AgeCalculationTests(SimpleTestCase):
    def test_birthday_boundaries_and_leap_day(self):
        self.assertEqual(age_from_date_of_birth(date(2014, 11, 18), date(2026, 11, 17)), 11)
        self.assertEqual(age_from_date_of_birth(date(2014, 11, 18), date(2026, 11, 18)), 12)
        self.assertEqual(age_from_date_of_birth(date(2012, 2, 29), date(2025, 2, 28)), 12)
        self.assertEqual(age_from_date_of_birth(date(2012, 2, 29), date(2025, 3, 1)), 13)
        self.assertIsNone(age_from_date_of_birth(None))


@override_settings(ALLOW_CUSTOM_SUBJECTS=True)
class ProfileAgeApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="age-profile", email="age@example.com", password="test-age-profile")
        self.client.force_authenticate(self.user)

    def test_create_edit_read_and_clear_birth_date(self):
        response = self.client.put('/api/students/me/', {
            'name': 'Learner', 'grade': '5th Grade', 'dateOfBirth': '2016-06-15',
            'curriculum': 'Undergraduate', 'goal': 'Learn something new',
        }, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['dateOfBirth'], '2016-06-15')
        self.assertEqual(response.data['age'], age_from_date_of_birth(date(2016, 6, 15)))
        response = self.client.patch('/api/students/me/', {'goal': 'Build confidence', 'age': 99}, format='json')
        self.assertEqual(response.data['dateOfBirth'], '2016-06-15')
        self.assertNotEqual(response.data['age'], 99)
        response = self.client.patch('/api/students/me/', {'dateOfBirth': '2015-07-16'}, format='json')
        self.assertEqual(response.data['dateOfBirth'], '2015-07-16')
        self.assertEqual(self.client.get('/api/students/me/').data['dateOfBirth'], '2015-07-16')
        response = self.client.patch('/api/students/me/', {'dateOfBirth': None}, format='json')
        self.assertIsNone(response.data['age'])
        self.assertIsNone(response.data['dateOfBirth'])

    def test_existing_profiles_can_omit_birth_date(self):
        response = self.client.put('/api/students/me/', {'name': 'Learner', 'grade': 'Masters'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIsNone(response.data['dateOfBirth'])
        self.assertIsNone(response.data['age'])

    def test_invalid_future_and_implausible_dates_are_rejected(self):
        for value in ['2020-02-30', (date.today() + timedelta(days=1)).isoformat(), '1800-01-01']:
            response = self.client.put('/api/students/me/', {'name': 'Learner', 'grade': '5th Grade', 'dateOfBirth': value}, format='json')
            self.assertEqual(response.status_code, 400)
            self.assertIn('dateOfBirth', response.data)

    def test_ai_receives_age_guidance_but_not_exact_birth_date(self):
        birth_date = date(2016, 6, 15)
        StudentProfile.objects.create(user=self.user, name='Learner', grade='College / University (Year 1)', date_of_birth=birth_date)
        ensure_subscription(self.user)
        with patch('kindling_platform.views.PlatformGeminiView._resolve_platform_gemini_key', return_value='fake-key'), patch('kindling_platform.views.urlopen', side_effect=URLError('test boundary')) as upstream:
            response = self.client.post('/api/platform/ai/gemini/', {
                'model': 'gemini-3.1-flash-lite', 'contents': 'Teach fractions',
                'config': {'systemInstruction': 'You are a tutor.'},
            }, format='json')
        self.assertEqual(response.status_code, 502)
        payload = json.loads(upstream.call_args.args[0].data)
        instruction = json.dumps(payload['systemInstruction'])
        self.assertIn('Learner age from saved profile:', instruction)
        self.assertIn('familiar school', instruction)
        self.assertNotIn(birth_date.isoformat(), instruction)
        self.assertIn('not ability', age_guidance(birth_date))
