#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <ctype.h>

typedef struct {
    const char *root;
    const char *scale[7];
    const char *maj_chord[3];
    const char *min_chord[3];
} KeyData;

KeyData circle_of_fifths[12] = {
    {
        "C",
        {"C", "D", "E", "F", "G", "A", "B"},
        {"C", "E", "G"},
        {"C", "Eb", "G"}
    },
    {
        "G",
        {"G", "A", "B", "C", "D", "E", "F#"},
        {"G", "B", "D"},
        {"G", "Bb", "D"}
    },
    {
        "D",
        {"D", "E", "F#", "G", "A", "B", "C#"},
        {"D", "F#", "A"},
        {"D", "F", "A"}
    },
    {
        "A",
        {"A", "B", "C#", "D", "E", "F#", "G#"},
        {"A", "C#", "E"},
        {"A", "C", "E"}
    },
    {
        "E",
        {"E", "F#", "G#", "A", "B", "C#", "D#"},
        {"E", "G#", "B"},
        {"E", "G", "B"}
    },
    {
        "B",
        {"B", "C#", "D#", "E", "F#", "G#", "A#"},
        {"B", "D#", "F#"},
        {"B", "D", "F#"}
    },
    {
        "F#",
        {"F#", "G#", "A#", "B", "C#", "D#", "E#"},
        {"F#", "A#", "C#"},
        {"F#", "A", "C#"}
    },
    {
        "C#",
        {"C#", "D#", "E#", "F#", "G#", "A#", "B#"},
        {"C#", "E#", "G#"},
        {"C#", "E", "G#"}
    },
    {
        "G#",
        {"G#", "A#", "B#", "C#", "D#", "E#", "F##"},
        {"G#", "B#", "D#"},
        {"G#", "B", "D#"}
    },
    {
        "Eb",
        {"Eb", "F", "G", "Ab", "Bb", "C", "D"},
        {"Eb", "G", "Bb"},
        {"Eb", "Gb", "Bb"}
    },
    {
        "Bb",
        {"Bb", "C", "D", "Eb", "F", "G", "A"},
        {"Bb", "D", "F"},
        {"Bb", "Db", "F"}
    },
    {
        "F",
        {"F", "G", "A", "Bb", "C", "D", "E"},
        {"F", "A", "C"},
        {"F", "Ab", "C"}
    }
};

void trim_newline(char *str) {
    str[strcspn(str, "\r\n")] = 0;
}

int check_answer(const char *input, const char *correct[], int size) {
    char temp[256];
    strcpy(temp, input);
    
    int count = 0;
    char *token = strtok(temp, " ");
    int correct_flag = 1;

    while (token != NULL) {
        if (count >= size || strcasecmp(token, correct[count]) != 0) {
            correct_flag = 0;
        }
        count++;
        token = strtok(NULL, " ");
    }

    if (count != size) {
        correct_flag = 0;
    }

    return correct_flag;
}

int main() {
    srand(time(NULL));
    int index = rand() % 12;
    KeyData current = circle_of_fifths[index];

    printf("Selected Root Note (from Circle of Fifths): %s\n\n", current.root);

    char input[256];

    // 1. Scale Quiz
    printf("1. Enter the notes of the %s Major Scale (space-separated, can include notes like B#): ", current.root);
    if (fgets(input, sizeof(input), stdin)) {
        trim_newline(input);
        if (check_answer(input, current.scale, 7)) {
            printf("Correct!\n");
        } else {
            printf("Incorrect. Correct scale: ");
            for (int i = 0; i < 7; i++) printf("%s ", current.scale[i]);
            printf("\n");
        }
    }

    // 2. Major Chord Quiz
    printf("\n2. Enter the notes of the %s Major Chord (space-separated): ", current.root);
    if (fgets(input, sizeof(input), stdin)) {
        trim_newline(input);
        if (check_answer(input, current.maj_chord, 3)) {
            printf("Correct!\n");
        } else {
            printf("Incorrect. Correct chord: ");
            for (int i = 0; i < 3; i++) printf("%s ", current.maj_chord[i]);
            printf("\n");
        }
    }

    // 3. Minor Chord Quiz
    printf("\n3. Enter the notes of the %s Minor Chord (space-separated): ", current.root);
    if (fgets(input, sizeof(input), stdin)) {
        trim_newline(input);
        if (check_answer(input, current.min_chord, 3)) {
            printf("Correct!\n");
        } else {
            printf("Incorrect. Correct chord: ");
            for (int i = 0; i < 3; i++) printf("%s ", current.min_chord[i]);
            printf("\n");
        }
    }

    return 0;
}
