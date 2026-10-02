from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("learning", "0020_independence_l4"),
    ]

    operations = [
        migrations.AddField(
            model_name="skillreviewitem",
            name="snoozed_until",
            field=models.DateTimeField(blank=True, db_index=True, null=True),
        ),
    ]
