function run_sc_tests()
    % RUN_SC_TESTS Верификация и модульное тестирование комплекса (обёртка).
    % Полный набор: tests/verify_sc_suite.m
    %
    % Запуск из корня проекта:
    %   run_sc_tests
    %
    % С отчётом в results/docs/verification_report.txt (по умолчанию включено).

    projDir = fileparts(mfilename('fullpath'));
    if ~isempty(projDir)
        addpath(projDir);
        addpath(fullfile(projDir, 'tests'));
    end

    verify_sc_suite(true, false, true);
end
