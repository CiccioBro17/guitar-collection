#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <ctype.h>

const char *chromatic[12] = {"C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"};
const char *circle_of_fifths[12] = {"C", "G", "D", "A", "E", "B", "F#", "C#", "G#", "D#", "A#", "F"};

int get_note_index(const char *note) {
    for (int i = 0; i < 12; i++) {
        if (strcasecmp(chromatic[i], note) == 0) {
            return i;
        }
    }
    return -1;
}

void trim_newline(char *str) {
    str[strcspn(str, "\r\n")] = 0;
}

int main() {
    srand(time(NULL));
    int index = rand() % 12;
    const char *root = circle_of_fifths[index];
    int root_idx = get_note_index(root);

    printf("Selected Root Note (from Circle of Fifths): %s\n\n", root);

    // 1. Major Scale intervals: 0, 2, 4, 5, 7, 9, 11
    int scale_intervals[7] = {0, 2, 4, 5, 7, 9, 11};
    char correct_scale[7][4];
    for (int i = 0; i < 7; i++) {
        strcpy(correct_scale[i], chromatic[(root_idx + scale_intervals[i]) % 12]);
    }

    // 2. Major Chord intervals: 0, 4, 7
    char correct_maj_chord[3][4];
    int maj_intervals[3] = {0, 4, 7};
    for (int i = 0; i < 3; i++) {
        strcpy(correct_maj_chord[i], chromatic[(root_idx + maj_intervals[i]) % 12]);
    }

    // 3. Minor Chord intervals: 0, 3, 7
    char correct_min_chord[3][4];
    int min_intervals[3] = {0, 3, 7};
    for (int i = 0; i < 3; i++) {
        strcpy(correct_min_chord[i], chromatic[(root_idx + min_intervals[i]) % 12]);
    }

    char input[256];

    // Quiz: Major Scale
    printf("1. Enter the notes of the %s Major Scale (space-separated): ", root);
    if (fgets(input, sizeof(input), stdin)) {
        trim_newline(input);
        int correct = 1;
        char *token = strtok(input, " ");
        int count = 0;
        while (token != NULL) {
            if (count >= 7 || strcasecmp(token, correct_scale[count]) != 0) {
                correct = 0;
            }
            count++;
            token = strtok(NULL, " ");
        }
        if (count != 7) correct = 0;

        if (correct) {
            printf("Correct!\n");
        } else {
            printf("Incorrect. Correct scale: ");
            for (int i = 0; i < 7; i++) printf("%s ", correct_scale[i]);
            printf("\n");
        }
    }

    // Quiz: Major Chord
    printf("\n2. Enter the notes of the %s Major Chord (space-separated): ", root);
    if (fgets(input, sizeof(input), stdin)) {
        trim_newline(input);
        int correct = 1;
        char *token = strtok(input, " ");
        int count = 0;
        while (token != NULL) {
            if (count >= 3 || strcasecmp(token, correct_maj_chord[count]) != 0) {
                correct = 0;
            }
            count++;
            token = strtok(NULL, " ");
        }
        if (count != 3) correct = 0;

        if (correct) {
            printf("Correct!\n");
        } else {
            printf("Incorrect. Correct chord: ");
            for (int i = 0; i < 3; i++) printf("%s ", correct_maj_chord[i]);
            printf("\n");
        }
    }

    // Quiz: Minor Chord
    printf("\n3. Enter the notes of the %s Minor Chord (space-separated): ", root);
    if (fgets(input, sizeof(input), stdin)) {
        trim_newline(input);
        int correct = 1;
        char *token = strtok(input, " ");
        int count = 0;
        while (token != NULL) {
            if (count >= 3 || strcasecmp(token, correct_min_chord[count]) != 0) {
                correct = 0;
            }
            count++;
            token = strtok(NULL, " ");
        }
        if (count != 3) correct = 0;

        if (correct) {
            printf("Correct!\n");
        } else {
            printf("Incorrect. Correct chord: ");
            for (int i = 0; i < 3; i++) printf("%s ", correct_min_chord[i]);
            printf("\n");
        }
    }

    return 0;
}
